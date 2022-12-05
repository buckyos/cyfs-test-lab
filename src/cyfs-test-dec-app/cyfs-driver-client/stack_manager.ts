

import { CyfsDriverType, CyfsStackDriverManager } from "./driver_manager"
import { CyfsStackDriver } from "./cyfs_driver"
import { DRIVER_TYPE, REAL_MACHINE_LIST, SIMULATOR_LIST } from "../config/cyfs_driver_config"
import * as cyfs from "../cyfs"
import { ErrorCode } from "../base";
var date = require("silly-datetime");
import path from "path";
import * as fs from "fs-extra";
export class StackManager {
    private driver_type: CyfsDriverType;
    // stack_map规则 ：{ `${peer_name}` : {`system`:SharedCyfsStack,`${}_${dec_id}`}}
    public peer_map: Map<string, Map<string, cyfs.SharedCyfsStack>>;
    private driver_manager?: CyfsStackDriverManager;
    public driver?: CyfsStackDriver

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
        let date_info = date.format(new Date(), 'YYYY_MM_DD_HH_mm_ss')
        let log_dir = path.join(__dirname, "../", "blog", date_info);
        if (!fs.pathExistsSync(log_dir)) {
            fs.mkdirpSync(log_dir);
        }
        cyfs.clog.enable_file_log({
            name: "cyfs_stack",
            dir: log_dir,
            file_max_size: 1024 * 1024 * 10,
            file_max_count: 10,
        });
        this.driver_manager = CyfsStackDriverManager.createInstance();
        let result = await this.driver_manager.create_driver(this.driver_type);
        if (result.err) {
            console.info(`${this.driver_type} create error,result = ${result}`)
            return result;
        }
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
            console.info(`######## cyfs satck check online running`)
            let running = true
            setTimeout(async () => {
                if (running) {
                    console.error(`######## check_stack_online timeout`)
                    V({ err: ErrorCode.cyfsStackOnlineTimeout, log: "cyfs satck online timeout" });
                }
            }, 20000)
            let check_list: Array<Promise<cyfs.BuckyResult<null>>> = [];
            for (let peer of this.peer_map.values()) {
                for (let stack of peer.values()) {
                    check_list.push(stack.wait_online());
                }
            }
            for (let check of check_list) {
                let result = await check;
                if (result.err) {
                    running = false;
                    console.error(`######## cyfs satck check online timeout`)
                    V({ err: ErrorCode.cyfsStackOnlineTimeout, log: "cyfs satck online timeout" });
                }
            }
            running = false;
            console.info(`######## cyfs satck check online sucesss`)
            V({ err: ErrorCode.succ, log: "success" })
        })

    }

    async load_real_machine(requestor_type: cyfs.CyfsStackRequestorType, dec_id?: cyfs.ObjectId) {
        for (let agent of REAL_MACHINE_LIST) {
            console.info(`${agent.peer_name} open bdt satck type = ${requestor_type} dec_id = ${dec_id}`);
            let stack_param = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(agent.http_port, agent.ws_port, dec_id).unwrap();
            if (requestor_type == cyfs.CyfsStackRequestorType.WebSocket) {
                let ws_param = cyfs.SharedCyfsStackParam.ws_requestor_config();
                stack_param.requestor_config = ws_param
            }
            let stack = cyfs.SharedCyfsStack.open(stack_param);
            let stack_map = new Map();
            if(dec_id){
                stack_map.set(`${dec_id.to_base_58()}_${requestor_type}`, stack);
            }else{
                stack_map.set(`system_${cyfs.CyfsStackRequestorType}`, stack);
            }
            this.peer_map.set(agent.peer_name, stack_map);
        }
    }
    async load_simulator(requestor_type: cyfs.CyfsStackRequestorType, dec_id?: cyfs.ObjectId) {
        for (let agent of SIMULATOR_LIST) {
            console.info(`${agent.peer_name} open bdt satck type = ${requestor_type} dec_id = ${dec_id}`);
            let stack_param = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(agent.http_port, agent.ws_port, dec_id).unwrap();
            if (requestor_type == cyfs.CyfsStackRequestorType.WebSocket) {
                let ws_param = cyfs.SharedCyfsStackParam.ws_requestor_config();
                stack_param.requestor_config = ws_param
            }
            let stack = cyfs.SharedCyfsStack.open(stack_param);
            let stack_map = new Map();
            if(dec_id){
                stack_map.set(`${dec_id.to_base_58()}_${requestor_type}`, stack);
            }else{
                stack_map.set(`system_${cyfs.CyfsStackRequestorType}`, stack);
            }
            
            this.peer_map.set(agent.peer_name, stack_map);
        }
    }
    get_cyfs_satck(peer_name:string,dec_id:string=`system`,type: cyfs.CyfsStackRequestorType = cyfs.CyfsStackRequestorType.Http ): { err: ErrorCode, log: string,stack?:cyfs.SharedCyfsStack} {
        if(!this.peer_map.has(peer_name)){
            return {err:ErrorCode.notFound,log:`error peer name ${peer_name}`}
        }
        if(!this.peer_map.get(peer_name)!.has(`${dec_id}_${type}`)){
            return {err:ErrorCode.notFound,log:`error dec_id dec_id =  ${dec_id},type = ${type}`}
        }
        return {err:ErrorCode.succ,log:`get cyfs stack success`,stack:this.peer_map.get(peer_name)!.get(`${dec_id}_${type}`)!}
    }

}


