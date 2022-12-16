import { CyfsStackClient, CyfsStackDriver } from "./cyfs_driver";
import { CyfsStackProxyDriver } from "./proxy/proxy_driver";
import { CyfsStackSimulatorDriver } from "./simulator/simulator_driver";
import { BDTDriver } from "./bdt_client/bdt_driver";
import {  ErrorCode } from "../base";
import path from "path";
import { DRIVER_TYPE } from "../config/cyfs_driver_config"
var date = require("silly-datetime");

export enum CyfsDriverType {
    real_machine = "real_machine",
    simulator = "Simulator",
    bdt_client = "bdt_client",
}

export class CyfsStackDriverManager {
    static manager?: CyfsStackDriverManager;
    private log_path: string;

    static createInstance(): CyfsStackDriverManager {
        if (!CyfsStackDriverManager.manager) {
            CyfsStackDriverManager.manager = new CyfsStackDriverManager();
        }
        return CyfsStackDriverManager.manager;
    }
    constructor(log_path?:string) {
        if(!log_path){
            let date_info = date.format(new Date(),'YYYY_MM_DD_HH_mm_ss')
            this.log_path = path.join(__dirname,"../","blog",date_info);
        }else{
            this.log_path =log_path
        }
    }

    async create_driver(type: CyfsDriverType): Promise<{ err: ErrorCode, log: string, driver?: CyfsStackDriver }> {
        console.info(`create cyfs stack test driver,type = ${type}`);
        let driver: CyfsStackDriver;
        if (type == CyfsDriverType.real_machine) {
            driver = new CyfsStackProxyDriver(this.log_path);
        } else if (type == CyfsDriverType.simulator) {
            driver = new CyfsStackSimulatorDriver(this.log_path);
        }else if (type == CyfsDriverType.bdt_client) {
            driver = new BDTDriver(this.log_path);
        } else {
            return { err: ErrorCode.notFound, log: "Error yfsDriverType" };
        }
        await driver.init();
        await driver.start();
        await driver.load_config();
        return { err: ErrorCode.succ, log: "success", driver };
    }
}