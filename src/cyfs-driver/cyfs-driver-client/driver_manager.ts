import { CyfsStackClient, CyfsStackDriver,CyfsStackClientConfig } from "./cyfs_driver";
import {ErrorCode,CyfsDriverType} from "../cyfs-test-base"
import { CyfsStackProxyDriver } from "./proxy/proxy_driver";
import { CyfsStackSimulatorDriver } from "./simulator/simulator_driver";
import path from "path";
var date = require("silly-datetime");
import * as fs from "fs-extra"
import * as toml from "toml"

//import { DRIVER_TYPE,REAL_MACHINE_LIST,SIMULATOR_LIST } from "../config/cyfs_driver_config"

export function load_toml(file_path:string){
    if(!fs.pathExistsSync(file_path)){
        console.error(`${file_path} is not exists`)
        return undefined
    }
    let data = fs.readFileSync(file_path);
    return toml.parse(data.toString());
}


export function load_driver_machine(){
    let cyfs_driver_client_conf = path.join(__dirname,"../config/cyfs_driver_client.toml")
    let config = load_toml(cyfs_driver_client_conf);
    return config.config
}

export class CyfsStackDriverManager {
    static manager?: CyfsStackDriverManager;
    private log_path: string;
    public stack_port_map: Array<CyfsStackClientConfig>
    private config : any;
    static createInstance(): CyfsStackDriverManager {
        if (!CyfsStackDriverManager.manager) {
            CyfsStackDriverManager.manager = new CyfsStackDriverManager();
        }
        return CyfsStackDriverManager.manager;
    }
    constructor(log_path?:string) {
        this.stack_port_map = [];
        this.config = load_driver_machine();
        if(this.config == undefined){
            throw new Error(`Please check your cyfs_driver_client.toml is exist`);
        }
        if(!log_path){
            let date_info = date.format(new Date(),'YYYY_MM_DD_HH_mm_ss')
            this.log_path = path.join(__dirname,"../","blog",date_info);
        }else{
            this.log_path =log_path
        }
    }

    async create_driver(type: CyfsDriverType,agent_list:Array<CyfsStackClientConfig>): Promise<{ err: ErrorCode, log: string, driver?: CyfsStackDriver }> {
        console.info(`create cyfs stack test driver,type = ${type}`);
        let driver: CyfsStackDriver;
        if (type == CyfsDriverType.real_machine) {  
            this.stack_port_map =  this.config.REAL_MACHINE_LIST!; 
            driver = new CyfsStackProxyDriver(this.log_path);
        } else if (type == CyfsDriverType.other){
            this.stack_port_map =  agent_list!;
            driver = new CyfsStackProxyDriver(this.log_path);
        }else if (type == CyfsDriverType.simulator) {
            this.stack_port_map =  this.config.SIMULATOR_LIST!; 
            driver = new CyfsStackSimulatorDriver(this.log_path);
        } else {
            return { err: ErrorCode.notFound, log: "Error yfsDriverType" };
        }
        console.info(`begin  driver.init `);
        await driver.init();
        console.info(`begin  driver.start `);
        await driver.start();
        console.info(`start load driver.load_config `);
        await driver.load_config(agent_list)
        console.info(`load driver.load_config finised`);
        return { err: ErrorCode.succ, log: "success", driver };
    }
}