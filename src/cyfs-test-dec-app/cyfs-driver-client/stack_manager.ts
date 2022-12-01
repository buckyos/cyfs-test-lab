

import { CyfsDriverType, CyfsStackDriverManager } from "./driver_manager"
import { CyfsStackDriver } from "./cyfs_driver"
import { DRIVER_TYPE, REAL_MACHINE_LIST, SIMULATOR_LIST } from "../config/cyfs_driver_config"
import * as cyfs from "../cyfs"
import { type } from "os"
import { ErrorCode } from "../base";

class StackManager {
    private driver_type: CyfsDriverType;
    // stack_map规则 ：{ `${peer_name}` : {`default`:SharedCyfsStack,`${}_${dec_id}`}}
    private peer_map: Map<string, Map<string, cyfs.SharedCyfsStack>>;
    private driver_manager?: CyfsStackDriverManager;
    private driver?: CyfsStackDriver

    constructor(driver_type?: CyfsDriverType) {
        this.peer_map = new Map();
        if (!driver_type) {
            // 不指定使用配置文件
            if (DRIVER_TYPE == CyfsDriverType.real_machine) {
                this.driver_type = CyfsDriverType.real_machine
            } else if (DRIVER_TYPE == CyfsDriverType.simulator) {
                this.driver_type = CyfsDriverType.simulator
            } else {
                // 默认使用模拟器
                this.driver_type = CyfsDriverType.simulator
            }
        } else {
            this.driver_type = driver_type;
        }
    }
    async init() {
        // 初始化测试驱动
        this.driver_manager = CyfsStackDriverManager.createInstance();
        await this.driver_manager.init();
        let result = await this.driver_manager.create_driver(this.driver_type);
        this.driver = result.driver;
        return result;

    }
    async load_config_stack(requestor_type: cyfs.CyfsStackRequestorType = cyfs.CyfsStackRequestorType.Http, dec_id?: cyfs.ObjectId): Promise<{ err: ErrorCode, log: string }> {
        if (this.driver_type == CyfsDriverType.real_machine) {
            await this.load_real_machine(requestor_type, dec_id)
        } else if (this.driver_type == CyfsDriverType.simulator) {
            await this.load_simulator(requestor_type, dec_id)
        }
        return await this.check_stack_online();
    }

    async check_stack_online(): Promise<{ err: ErrorCode, log: string }> {
        return new Promise(async (V) => {
            let check_list: Array<Promise<cyfs.BuckyResult<null>>> = [];
            for (let peer of this.peer_map.values()) {
                for (let stack of peer.values()) {
                    check_list.push(stack.wait_online(cyfs.JSBI.BigInt(10000)));
                }
            }
            for (let check of check_list) {
                let result = await check;
                if (result.err) {
                    V({ err: ErrorCode.cyfsStackOnlineTimeout, log: "cyfs satck online timeout" });
                }
            }
            V({ err: ErrorCode.succ, log: "success" })
        })

    }

    async load_real_machine(requestor_type: cyfs.CyfsStackRequestorType, dec_id?: cyfs.ObjectId) {
        for (let agent of REAL_MACHINE_LIST) {
            let stack_param = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(agent.http_port, agent.ws_port, dec_id).unwrap();
            if (requestor_type == cyfs.CyfsStackRequestorType.WebSocket) {
                let ws_param = cyfs.SharedCyfsStackParam.ws_requestor_config();
                stack_param.requestor_config = ws_param
            }
            let stack = cyfs.SharedCyfsStack.open(stack_param);
            let stack_map = new Map();
            stack_map.set("default", stack);
            this.peer_map.set(agent.peer_name, stack_map);
        }
    }
    async load_simulator(requestor_type: cyfs.CyfsStackRequestorType, dec_id?: cyfs.ObjectId) {
        for (let agent of SIMULATOR_LIST) {
            let stack_param = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(agent.http_port, agent.ws_port, dec_id).unwrap();
            if (requestor_type == cyfs.CyfsStackRequestorType.WebSocket) {
                let ws_param = cyfs.SharedCyfsStackParam.ws_requestor_config();
                stack_param.requestor_config = ws_param
            }
            let stack = cyfs.SharedCyfsStack.open(stack_param);
            let stack_map = new Map();
            stack_map.set("default", stack);
            this.peer_map.set(agent.peer_name, stack_map);
        }
    }
}


