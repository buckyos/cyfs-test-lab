
import { CyfsStackClient, CyfsStackDriver } from "../cyfs_driver"
import { ErrorCode, Namespace, Logger,DirHelper, sleep,  } from "../../base"
import { CyfsStackSimulatorClient } from "./simulator_client"
import * as ChildProcess from 'child_process';
import path from "path";
import { SIMULATOR_LIST } from "../../config/cyfs_driver_config"
const Base = require('../../base/common/base.js');
export class CyfsStackSimulatorDriver implements CyfsStackDriver {
    private stack_client_map: Map<string, CyfsStackSimulatorClient>
    private log_path: string;
    private cache_path : string;
    private simulator_path : string;
    private pid: number;
    private process?: ChildProcess.ChildProcess;
    private logger: Logger;
    constructor(log_path:string) {
        this.log_path = log_path;
        this.cache_path = path.join(this.log_path,"../cache");
        this.simulator_path = path.join(__dirname,"../../cyfs/zone-simulator.exe")
        this.stack_client_map = new Map();
        this.pid = 0;
        DirHelper.setRootDir(path.join(__dirname, "../../"));
        Base.BX_SetLogLevel(Base.BLOG_LEVEL_DEBUG);
        Base.BX_EnableFileLog(log_path, `cyfs_stack_real_driver_${Date.now()}`, '.log');
        Base.blog.enableConsoleTarget(false);
        this.logger = new Logger(Base.blog.info, Base.blog.debug, Base.blog.error, log_path);
        
    }
    async init(): Promise<{ err: ErrorCode, log: string }> {
        // 加载配置文件中
        return { err: ErrorCode.succ, log: "init success" }
    }
    async start(): Promise<{ err: ErrorCode, log: string }> {
        await this.stop();
        return new Promise(async (v) => {
            this.logger.info(`####### start Zone Simulator ${this.simulator_path}`)
            this.process =  ChildProcess.spawn(this.simulator_path, [], { windowsHide: false, detached: false, stdio: 'ignore', cwd: path.dirname(this.simulator_path) })
            this.process.unref();
            while (!this.pid) {
                await this.initPid();
            }
            v({err:ErrorCode.succ,log:"start Zone Simulator success"})
        })
    }
    async initPid() {
        this.logger.info(`begin initPid ${this.pid}`)
        return new Promise(async (v) => {
            let process = ChildProcess.exec(`tasklist|findstr /c:zone-simulator.exe`)
            process!.on('exit', (code: number, singal: any) => {
                this.logger.info(`check finished,pid = ${this.pid}`);
                v(this.pid)
            });
            process.stdout?.on('data', (data) => {
                let pid_data: string = `${data.toString()}`;
                this.logger.info(`check result = ${pid_data}`)
                let str = pid_data.split('Console')[0].split(`zone-simulator.exe`)[1];
                if(!str){
                    pid_data.split('RDP-Tcp')[0].split(`zone-simulator.exe`)[1];
                }
                this.logger.info(`cehck result split = ${str}`)
                this.logger.info(str);
                if (str) {
                    this.pid = Number(str)
                    v(this.pid)
                } else {
                    this.pid = 0;
                }
            });
            process.on("error", (err) => {
                this.logger.info(`initPid failed,err=${err}`)
                v(false)
            })
        })

    }
    async stop(): Promise<{ err: ErrorCode, log: string }> {
        this.process = undefined;
        return new Promise(async (v) => {
            this.logger.info(`####### run stopZoneSimulator`)
            let process = ChildProcess.exec(`taskkill /f /t /im zone-simulator.exe`)
            process.on('exit', (code: number, singal: any) => {
                this.logger.info(`stopZoneSimulator exist`)
                v({err:ErrorCode.succ,log:`stop success`});
            });
            process.stdout?.on('data', (data) => {
                let str: string = `${data.toString()}`;
                v({err:ErrorCode.succ,log:`stop success`});
            });
        })
    }
    async restart(): Promise<{ err: ErrorCode, log: string }> {
        let result = await this.stop();
        if(result.err){
            return result;
        }
        result = await this.start();
        return result
    }
    async load_config(): Promise<{ err: ErrorCode, log: string }> {
        let run_list: Array<Promise<{ err: ErrorCode, log: string }>> = [];
        for (let agent of SIMULATOR_LIST) {
            run_list.push(new Promise(async (V) => {
                this.logger.info(`load CyfsStackSimulatorClient ${agent.peer_name}`)
                let client = new CyfsStackSimulatorClient(agent,this.logger,this.cache_path)
                let result = await client.init();
                if (result.err) {
                    this.logger.error(`${agent.peer_name} start CyfsStackProxyClient fialed `)
                    V(result);
                }
                this.stack_client_map.set(agent.peer_name, client)
                V(result);
            }))

        }
        for (let run of run_list) {
            let result = await run;
            if (result.err) {
                return result;
            }
        }
        return { err: ErrorCode.succ, log: "init success" }
    }
    get_client(name: string): { err: ErrorCode, log: string, client?: CyfsStackSimulatorClient } {
        if (!this.stack_client_map.has(name)) {
            return { err: ErrorCode.notFound, log: "cleint not found" }
        }
        this.logger.info(`CyfsStackSimulatorDriver get_client ${name} success`)
        return { err: ErrorCode.succ, log: "init success", client: this.stack_client_map.get(name)! }
    }
    add_client(name: string, client: CyfsStackSimulatorClient): { err: ErrorCode, log: string } {
        if (this.stack_client_map.has(name)) {
            return { err: ErrorCode.invalidState, log: "cleint is exist" }
        }
        this.stack_client_map.set(name, client);
        return { err: ErrorCode.succ, log: "init success" }
    }
}

