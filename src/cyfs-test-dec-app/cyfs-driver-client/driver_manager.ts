import { CyfsStackClient, CyfsStackDriver,CyfsDriverType,CyfsStackClientConfig } from "./cyfs_driver";
import { CyfsStackProxyDriver } from "./proxy/proxy_driver";
import { CyfsStackSimulatorDriver } from "./simulator/simulator_driver";
import { BDTDriver } from "./bdt_client/bdt_driver";
import {  ErrorCode } from "../common";
import path from "path";
import { DRIVER_TYPE,REAL_MACHINE_LIST,SIMULATOR_LIST } from "../config/cyfs_driver_config"
var date = require("silly-datetime");


export class CyfsStackDriverManager {
    static manager?: CyfsStackDriverManager;
    private log_path: string;
    public stack_port_map: Array<CyfsStackClientConfig>
    
    static createInstance(): CyfsStackDriverManager {
        if (!CyfsStackDriverManager.manager) {
            CyfsStackDriverManager.manager = new CyfsStackDriverManager();
        }
        return CyfsStackDriverManager.manager;
    }
    constructor(log_path?:string) {
        this.stack_port_map = [];
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
            this.stack_port_map =  REAL_MACHINE_LIST!; 
            driver = new CyfsStackProxyDriver(this.log_path);
        } else if (type == CyfsDriverType.other){
            this.stack_port_map =  agent_list!;
            driver = new CyfsStackProxyDriver(this.log_path);
        }else if (type == CyfsDriverType.simulator) {
            this.stack_port_map =  SIMULATOR_LIST!; 
            driver = new CyfsStackSimulatorDriver(this.log_path);
        }else if (type == CyfsDriverType.bdt_client) {
            driver = new BDTDriver(this.log_path);
        } else {
            return { err: ErrorCode.notFound, log: "Error yfsDriverType" };
        }
        console.info(`begin  driver.init `);
        await driver.init();
        console.info(`begin  driver.start `);
        await driver.start();
        console.info(`begin  driver.load_config `);
        await driver.load_config(agent_list)
        return { err: ErrorCode.succ, log: "success", driver };
    }
}