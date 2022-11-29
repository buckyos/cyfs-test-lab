
import {CyfsStackClient,CyfsStackDriver} from "../cyfs_driver"
import {ErrorCode,Namespace,Logger, TaskClientInterface} from "../../base"
import {CyfsStackSimulatorClient} from "./simulator_client"

export class CyfsStackSimulatorDriver implements CyfsStackDriver{
    private stack_client_map : Map<string,CyfsStackSimulatorClient>
    private logger : Logger;
    constructor(logger : Logger){
        this.logger = logger;
        this.stack_client_map = new Map();
    }
    async init():Promise<{err:ErrorCode,log:string}>{
        // 加载配置文件中
        return {err:ErrorCode.succ , log:"init success"}
    }
    async start():Promise<{err:ErrorCode,log:string}>{
        return {err:ErrorCode.succ , log:"init success"}
    }
    async stop():Promise<{err:ErrorCode,log:string}>{
        return {err:ErrorCode.succ , log:"init success"}
    }
    async restart():Promise<{err:ErrorCode,log:string}>{
        return {err:ErrorCode.succ , log:"init success"}
    }
    async load_config():Promise<{err:ErrorCode,log:string}>{
        return {err:ErrorCode.succ , log:"init success"}
    }
    get_client(name:string):{err:ErrorCode,log:string,client:CyfsStackSimulatorClient}{
        return {err:ErrorCode.succ , log:"init success",client:this.stack_client_map.get(name)!}
    }
    add_client(name:string):{err:ErrorCode,log:string,client:CyfsStackSimulatorClient}{
        return {err:ErrorCode.succ , log:"init success",client:this.stack_client_map.get(name)!}
    }
}

