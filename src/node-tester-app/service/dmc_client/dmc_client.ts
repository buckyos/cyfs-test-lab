

import { ErrorCode, Namespace, BufferWriter, ServiceClientInterface, Logger, sleep } from '../../base';
import { EventEmitter } from 'events';
import * as ChildProcess from 'child_process';
import * as os from 'os';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as SysProcess from 'process';
import * as crypto from 'crypto';

export class DMCClient  extends EventEmitter{
    private client_path : string;
    private server_path : string;
    private m_logger: Logger;
    private m_interface: ServiceClientInterface
    private m_platform: string;
    private root_path : string;
    private server? : ChildProcess.ChildProcess
    constructor(_interface: ServiceClientInterface,root_path:string=__dirname) {
        super();
        this.root_path = root_path;
        this.m_interface = _interface;
        this.m_logger = _interface.getLogger();
        this.m_platform = _interface.getPlatform();
        if (this.m_platform === 'win32') {
            this.client_path = path.join(this.root_path, "win" , 'dmc-user-lite-client.exe')
            this.server_path = path.join(this.root_path, "win" , 'dmc-user-lite-server.exe')
        } else if (this.m_platform === 'linux') {
            this.client_path = path.join(this.root_path, "linux", 'dmc-user-lite-client')
            this.server_path = path.join(this.root_path, "linux", 'dmc-user-lite-server')
          
        } else {
            this.client_path = path.join(this.root_path, "mac", 'dmc-user-lite-client')
            this.server_path = path.join(this.root_path, "mac", 'dmc-user-lite-server')
        }
    }

    async init(){
        if(this.m_platform === 'linux'){
            this.m_logger.info(`linux platform excute chmod +x ${this.client_path} and ${this.server_path}`)
            await ChildProcess.exec(`chmod +x ${this.client_path}`, { cwd: path.dirname(this.root_path) })
            await ChildProcess.exec(`chmod +x ${this.server_path}`, { cwd: path.dirname(this.root_path) })
        }
    }

    async start_server(){
        if(this.server){
            this.m_logger.info(`dmc lite server has been started`)
            return
        }
        console.info(`excute ${this.server_path}`)
        this.server = ChildProcess.spawn(`${this.server_path}`,[],{ stdio: 'ignore', cwd: this.root_path, detached: true, windowsHide: true, env:{}});
        this.server!.stdout?.on('data', (data) => {
            this.m_logger.info(data)
        });
        this.server!.on("error",async (error)=>{
            this.m_logger.info(error)
        })
    }
    async stop_server(){
        if(this.server){
            this.server.emit("exit")
            return
        }
    }
    async excute_cmd(cmd:string,timeout:number=60*1000):Promise<{code:number,print_data:string,error_stack?:string,error_msg?:string}>{
        return new Promise(async(resolve)=>{
            let child_process = ChildProcess.exec(`${this.client_path} ${cmd}`);
            let print_data = "";
            if(timeout){
                let keep_alive = setTimeout(()=>{
                    resolve({code:0,print_data})
                },timeout)
            }
            child_process.stdout!.on('data', (data:string) => {
                console.info(`dmc client-> ${data}`)
                print_data = print_data + data;
                if(data.includes("backup started, sector_id")){
                    resolve({code:0,print_data})
                }
            });
            child_process.on("exit",(code,singal)=>{
                resolve({code,print_data})
            })
            child_process.on("error",(error)=>{
                resolve({code:1,print_data,error_stack:`${error.stack}`,error_msg:`${error.message}`})
            })
        })
    }
}