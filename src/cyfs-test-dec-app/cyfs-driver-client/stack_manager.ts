

import {  CyfsStackDriverManager } from "./driver_manager"
import { CyfsStackDriver,CyfsDriverType,CyfsStackClientConfig } from "./cyfs_driver"
import { DRIVER_TYPE, REAL_MACHINE_LIST, SIMULATOR_LIST ,REAL_MACHINE_OTHER_LIST} from "../config/cyfs_driver_config"
import * as cyfs from "../cyfs"
import { ErrorCode, Logger } from "../base";
var date = require("silly-datetime");
import path from "path";
import * as fs from "fs-extra";


export type PeerInfo ={ 
    peer_name: string, 
    dec_id?: string, 
    type?: cyfs.CyfsStackRequestorType,
    device_id?:cyfs.ObjectId 
}

export class StackManager {
    private driver_type: CyfsDriverType;
    static manager?: StackManager;
    // stack_map规则 ：{ `${peer_name}` : {`system`:SharedCyfsStack,`${}_${dec_id}`}}
    public peer_map: Map<string, Map<string, cyfs.SharedCyfsStack | undefined>>;
    private driver_manager?: CyfsStackDriverManager;
    public agent_list?: Array<CyfsStackClientConfig>;
    public driver?: CyfsStackDriver
    public logger?: Logger;
    //单例模式
    static createInstance(driver_type?: CyfsDriverType,agent_list?:Array<CyfsStackClientConfig>): StackManager {
        if (!StackManager.manager) {
            StackManager.manager = new StackManager(driver_type,agent_list);
        }
        return StackManager.manager;
    }
    constructor(driver_type?: CyfsDriverType,agent_list?:Array<CyfsStackClientConfig>) {
        this.peer_map = new Map();
        if (!driver_type) {
            // 不指定使用配置文件
            if (DRIVER_TYPE == CyfsDriverType.real_machine.toString()) {
                this.driver_type = CyfsDriverType.real_machine
                this.agent_list = REAL_MACHINE_LIST
            } else if (DRIVER_TYPE == CyfsDriverType.simulator.toString()) {
                this.driver_type = CyfsDriverType.simulator
                this.agent_list = SIMULATOR_LIST
            } else if(DRIVER_TYPE == CyfsDriverType.other.toString()){
                this.driver_type = CyfsDriverType.other
                this.agent_list = agent_list;
            }  else {
                // 默认使用模拟器
                this.driver_type = CyfsDriverType.simulator
                this.agent_list = SIMULATOR_LIST
            }
        } else {
            this.driver_type = driver_type;
            this.agent_list = agent_list;
        }
    }
    get_logger() {
        return this.logger!;
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
        this.logger = new Logger(cyfs.clog.info, cyfs.clog.debug, cyfs.clog.error, log_dir)
        this.logger.info(`init cyfs stack manager log success`);
        this.driver_manager = CyfsStackDriverManager.createInstance();
        let result = await this.driver_manager.create_driver(this.driver_type,this.agent_list!);
        if (result.err) {
            this.logger!.info(`${this.driver_type} create error,result = ${result}`)
            return result;
        }
        this.driver = result.driver;
        return result;

    }
    async load_config_stack(requestor_type: cyfs.CyfsStackRequestorType = cyfs.CyfsStackRequestorType.Http, dec_id: cyfs.ObjectId): Promise<{ err: ErrorCode, log: string }> {
        if (this.driver_type == CyfsDriverType.real_machine) {
            await this.load_real_machine(requestor_type, dec_id)
        } else if (this.driver_type == CyfsDriverType.simulator) {
            await this.load_simulator(requestor_type, dec_id)
        } else if (this.driver_type == CyfsDriverType.other) {
            await this.load_driver_manager(requestor_type, dec_id)
        }
        return await this.check_stack_online();
    }

    async check_stack_online(): Promise<{ err: ErrorCode, log: string }> {
        return new Promise(async (V) => {
            this.logger!.info(`######## cyfs satck check online running`)
            let running = true
            setTimeout(async () => {
                if (running) {
                    this.logger!.error(`######## check_stack_online timeout`)
                    V({ err: ErrorCode.cyfsStackOnlineTimeout, log: "cyfs satck online timeout" });
                }
            }, 20000)
            let check_list: Array<Promise<cyfs.BuckyResult<null>>> = [];
            for (let peer of this.peer_map.values()) {
                for (let stack of peer.values()) {
                    check_list.push(stack!.wait_online());
                }
            }
            for (let check of check_list) {
                let result = await check;
                if (result.err) {
                    running = false;
                    this.logger!.error(`######## cyfs satck check online fail,result = ${JSON.stringify(result)}`)
                    V({ err: ErrorCode.cyfsStackOnlineFailed, log: "cyfs satck online failed" });
                }
            }
            running = false;
            this.logger!.info(`######## cyfs satck check online sucesss`)
            V({ err: ErrorCode.succ, log: "success" })
        })

    }

    async load_real_machine(requestor_type: cyfs.CyfsStackRequestorType, dec_id: cyfs.ObjectId) {
        
        for (let agent of REAL_MACHINE_LIST) {
            this.logger!.info(`${agent.peer_name} open bdt satck type = ${requestor_type} dec_id = ${dec_id}`);
            let stack_param = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(agent.http_port, agent.ws_port, dec_id).unwrap();
            if (requestor_type == cyfs.CyfsStackRequestorType.WebSocket) {
                let ws_param = cyfs.SharedCyfsStackParam.ws_requestor_config();
                stack_param.requestor_config = ws_param
            }
            let stack_map = new Map();
            if(this.peer_map.has(agent.peer_name)){
                stack_map = this.peer_map.get(agent.peer_name)!
            }else{
                this.peer_map.set(agent.peer_name, stack_map);
            }
            let stack = cyfs.SharedCyfsStack.open(stack_param);
            if (dec_id) {
                stack_map.set(`${dec_id.to_base_58()}_${requestor_type}`, stack);
            } else {
                stack_map.set(`system_${cyfs.CyfsStackRequestorType}`, stack);
            }
        }
    }

    async load_driver_manager(requestor_type: cyfs.CyfsStackRequestorType, dec_id: cyfs.ObjectId) {
        for (let agent of this.driver_manager!.stack_port_map) {
            this.logger!.info(`${agent.peer_name} open bdt satck type = ${requestor_type} dec_id = ${dec_id}`);
            let stack_param = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(agent.http_port, agent.ws_port, dec_id).unwrap();
            if (requestor_type == cyfs.CyfsStackRequestorType.WebSocket) {
                let ws_param = cyfs.SharedCyfsStackParam.ws_requestor_config();
                stack_param.requestor_config = ws_param
            }
            let stack_map = new Map();
            if(this.peer_map.has(agent.peer_name)){
                stack_map = this.peer_map.get(agent.peer_name)!
            }else{
                this.peer_map.set(agent.peer_name, stack_map);
            }
            let stack = cyfs.SharedCyfsStack.open(stack_param);
            if (dec_id) {
                stack_map.set(`${dec_id.to_base_58()}_${requestor_type}`, stack);
            } else {
                stack_map.set(`system_${cyfs.CyfsStackRequestorType}`, stack);
            }
        }
    }

    async load_simulator(requestor_type: cyfs.CyfsStackRequestorType, dec_id: cyfs.ObjectId) {
        for (let agent of SIMULATOR_LIST) {
            this.logger!.info(`${agent.peer_name} open bdt satck type = ${requestor_type} dec_id = ${dec_id}`);
            let stack_param = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(agent.http_port, agent.ws_port, dec_id).unwrap();
            if (requestor_type == cyfs.CyfsStackRequestorType.WebSocket) {
                let ws_param = cyfs.SharedCyfsStackParam.ws_requestor_config();
                stack_param.requestor_config = ws_param
            }
            let stack_map = new Map();
            if(this.peer_map.has(agent.peer_name)){
                stack_map = this.peer_map.get(agent.peer_name)!
            }else{
                this.peer_map.set(agent.peer_name, stack_map);
            }
            let stack = cyfs.SharedCyfsStack.open(stack_param);
            if (dec_id) {
                stack_map.set(`${dec_id.to_base_58()}_${requestor_type}`, stack);
            } else {
                stack_map.set(`system_${cyfs.CyfsStackRequestorType}`, stack);
            }
        }
    }
   
    
    get_cyfs_satck(local: PeerInfo): { err: ErrorCode, log: string, stack?: cyfs.SharedCyfsStack } {
        if (!this.peer_map.has(local.peer_name)) {
            return { err: ErrorCode.notFound, log: `error peer name ${local.peer_name}` }
        }
        if (!this.peer_map.get(local.peer_name)!.has(`${local.dec_id}_${local.type}`)) {
            return { err: ErrorCode.notFound, log: `error dec_id dec_id =  ${local.dec_id},type = ${local.type}` }
        }
        this.logger!.info(`get satck ${local.peer_name} success,dec_id = ${local.dec_id} type = ${local.type}`)
        return { err: ErrorCode.succ, log: `get cyfs stack success`, stack: this.peer_map.get(local.peer_name)!.get(`${local.dec_id}_${local.type}`)! }
    }
    get_device_id(local: PeerInfo):{ err: ErrorCode, log: string, device_id?: cyfs.DeviceId }{
        if (!this.peer_map.has(local.peer_name)) {
            return { err: ErrorCode.notFound, log: `error peer name ${local.peer_name}` }
        }
        if (!this.peer_map.get(local.peer_name)!.has(`${local.dec_id}_${local.type}`)) {
            return { err: ErrorCode.notFound, log: `error dec_id dec_id =  ${local.dec_id},type = ${local.type}` }
        }
        let device_id =  this.peer_map.get(local.peer_name)!.get(`${local.dec_id}_${local.type}`)!.local_device_id();
        return { err: ErrorCode.succ, log: `get cyfs stack device_id success`, device_id}
    } 

    destory() {
        this.logger!.info(`cyfs satck manager destory all cyfs stack`)
        for (let peer of this.peer_map.values()) {
            for (let stack of peer.values()) {
                stack = undefined;
            }
        }
        this.peer_map.clear()
    }

}


