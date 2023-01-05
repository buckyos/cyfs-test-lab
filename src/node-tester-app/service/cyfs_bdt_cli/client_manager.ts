import { ErrorCode, Namespace, BufferWriter, ServiceClientInterface, Logger, sleep } from '../../base';
import { RandomGenerator } from "./generator"
import * as net from 'net';
import { EventEmitter } from 'events';
import { BdtLpc, BdtLpcCommand, BdtLpcResp } from './lpc';
import { LpcClient } from './lpc_client';
import * as ChildProcess from 'child_process';
import * as os from 'os';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as SysProcess from 'process';
import * as crypto from 'crypto';
import { UtilTool } from "./util"
import { Started, LpcActionApi } from "./action_api";

type PeerInfo = {
    peer?: LpcClient;
}
export class BdtClientManager extends EventEmitter {
    static manager?: BdtClientManager;
    private m_localServerPort: number = 0;
    private m_logger: Logger;
    private m_interface: ServiceClientInterface
    private m_peerIndex: number = 1;
    private m_peers: Map<string, PeerInfo>;
    private m_platform: string;
    private exefile?: string;
    private m_lpcStatus: boolean;
    private is_perf: boolean = false;
    private utilTool?: UtilTool
    private bdt_port_index : number;

    on(event: 'peer', listener: (peer: LpcClient) => void): this;
    on(event: 'unlive', listener: (client_name: string) => void): this;

    on(event: string, listener: (...args: any[]) => void): this {
        super.on(event, listener);
        return this;
    }

    once(event: 'peer', listener: (peer: LpcClient) => void): this;
    once(event: 'unlive', listener: (client_name: string) => void): this;

    once(event: string, listener: (...args: any[]) => void): this {
        super.once(event, listener);
        return this;
    }

    static createInstance(_interface: ServiceClientInterface): BdtClientManager {
        if (!BdtClientManager.manager) {
            BdtClientManager.manager = new BdtClientManager(_interface);
        }
        return BdtClientManager.manager;
    }

    constructor(_interface: ServiceClientInterface) {
        super();
        this.m_interface = _interface;
        this.m_logger = _interface.getLogger();
        this.m_peers = new Map();
        this.m_platform = _interface.getPlatform();
        this.m_lpcStatus = false;
        this.bdt_port_index = 25000;

    }
    async stop_server_win() {
        return new Promise(async (v) => {
            this.m_logger.info(`Stop Process bdt-toools`)
            let process = ChildProcess.exec(`taskkill /f /t /im bdt-cli.exe`)
            process.on('data', (data) => {
                this.m_logger.info(`taskkill /f /t /im bdt-cli.exe : ${data}`)
            });
            process.on('exit', (code: number, singal: any) => {
                v('');
            });
        })

    }
    async stop_server_linux() {
        return new Promise(async (v) => {
            this.m_logger.info(`Stop Process bdt-cli`)
            let process = ChildProcess.exec(`sudo kill -9 $(pidof bdt-cli)`)
            process.on('data', (data) => {
                this.m_logger.info(`sudo kill -9 $(pidof bdt-cli : ${data}`)
            });
            process.on('exit', (code: number, singal: any) => {
                v('');
            });
        })

    }
    async init(): Promise<ErrorCode> {
        this.utilTool = new UtilTool(this.m_interface, this.m_logger);
        if (this.m_platform === 'win32') {
            this.exefile = path.join(SysProcess.cwd(), 'bdt-cli.exe')
        } else if (this.m_platform === 'linux') {
            this.exefile = path.join(SysProcess.cwd(), 'bdt-cli')
            this.m_logger.info(`chmod +x ${this.exefile}`);
            await ChildProcess.exec(`chmod +x ${this.exefile}`, { cwd: path.dirname(SysProcess.cwd()) })
        } else if (os.arch() == 'arm') {
            this.exefile = path.join(SysProcess.cwd(), 'bdt-cli-android32')
            await ChildProcess.exec(`chmod +x ${this.exefile}`, { cwd: path.dirname(SysProcess.cwd()) })
        } else if (os.arch() == 'arm64') {
            this.exefile = path.join(SysProcess.cwd(), 'bdt-cli-android64')
            await ChildProcess.exec(`chmod +x ${this.exefile}`, { cwd: path.dirname(SysProcess.cwd()) })
        } else {
            this.exefile = path.join(SysProcess.cwd(), 'bdt-cli')
            await ChildProcess.exec(`chmod +x ${this.exefile}`, { cwd: path.dirname(SysProcess.cwd()) })
        }
        return ErrorCode.succ;
    }
    async kill_server() {
        if (this.m_platform === 'linux') {
            await this.stop_server_linux()
        }
        if (this.m_platform === 'win32') {
            await this.stop_server_win()
        }
        await sleep(5000);
    }
    async start_peer(log_type: string = 'trace', client_name: string, port: number, kill_server: boolean = false): Promise<{ err: ErrorCode, client_name: string }> {
        if (kill_server) {
            await this.kill_server();
        }
        this.bdt_port_index = this.bdt_port_index + 2000;
        return new Promise(async (V) => {
            let lpc: BdtLpc = new BdtLpc({
                logger: this.m_logger,
            });
            // 尝试连接现有客户端
            let connect = await this.connect_bdt_cli(lpc, port, 1);
            let check_timeout = true;
            // 没有现有端口 客户端 ，启动一个新的
            let log_path = path.join(this.m_logger.dir(),client_name);
            if (connect.err) {
                this.m_logger.info(`os type ${os.arch()}`)
                this.m_logger.info(`os type ${this.m_platform}`)
                this.m_logger.info(`run bdt cli path ${this.exefile!}`)
                
                fs.removeSync(log_path);
                let sub = ChildProcess.spawn(`${this.exefile!}`, [port.toString(), client_name, log_path, __dirname,this.bdt_port_index.toString()], { stdio: 'ignore', cwd: SysProcess.cwd(), detached: true, windowsHide: true, env: { CYFS_CONSOLE_LOG_LEVEL: `${log_type}`, CYFS_FILE_LOG_LEVEL_KEY: `${log_type}`, RUST_LOG: `${log_type}` } });
                sub.unref();
                
                await sleep(2000);
                this.m_logger.info(`####bdt-cli ${client_name} start`);
                let re_conn = await this.connect_bdt_cli(lpc, port);
                if (re_conn.err) {
                    check_timeout = false;
                    return V({ err: ErrorCode.fail, client_name: `${client_name!}` })
                }
            }

            let onCommand = (l: BdtLpc, c: BdtLpcCommand) => {
                let action: LpcActionApi = c.json;
                if (!action?.Started?.client_name) {
                    this.m_logger.error(`peer manager start bdtpeer failed, for first command not started`);
                } else {
                    client_name = action.Started.client_name
                    this.m_logger.info(`recv new connection  from bdt-tools,command =  ${JSON.stringify(c.json)} `)
                    let peer = new LpcClient({
                        client_name: action.Started.client_name,
                        logger: this.m_logger,
                    })
                    let result = peer.initFromLpc(lpc);
                    lpc.on('close', (l: BdtLpc, err: boolean) => {
                        this.emit('unlive', c.json.client_name);
                        this.m_logger.error(`peer manager delete peer name=${peer.client_name}`);
                        this.m_peers.delete(c.json.client_name);
                        this.m_logger.info(`peer manager peers ${this.m_peers}`);
                        this.m_lpcStatus = false;

                    });
                    lpc.on('error', () => {
                        this.emit('unlive', c.json.client_name);
                        this.m_peers.delete(c.json.client_name);
                        this.m_lpcStatus = false;

                    });
                    this.m_logger.info(`insert ${client_name} into peers list`)
                    this.m_peers.set(client_name, { peer });
                    this.emit('peer', peer);
                    check_timeout = false;
                    return V({ err: ErrorCode.succ, client_name: `${client_name!}`});
                }
            };
            lpc.once('command', onCommand);
            setTimeout(() => {
                if (check_timeout) {
                    return V({ err: ErrorCode.timeout, client_name: `${client_name!}` });
                }
            }, 20 * 1000);
        })

    }
    async connect_bdt_cli(lpc: BdtLpc, port: number = 22222, run_sum: number = 5): Promise<{ err: ErrorCode }> {
        while (run_sum > 0) {
            run_sum = run_sum - 1;
            let result = await lpc.initFromListener(port);
            if (result == 0) {
                return { err: result }
            }
            await sleep(1000);

        }
        return { err: ErrorCode.fail }
    }
    async util_request(command: BdtLpcCommand): Promise<BdtLpcResp> {
        return await this.utilTool!.utilRequest(command);
    }
    async send_bdt_lpc_command(client_name: string, command: BdtLpcCommand): Promise<BdtLpcResp> {
        if (!this.m_peers.has(client_name)) {
            this.m_logger.error(`${client_name} not exist`)
            return { err: ErrorCode.notExist };
        }
        let result = await this.m_peers.get(client_name)!.peer!.sendBdtLpcCommand(command);
        return result;
    }
    async create_bdt_lpc_listener(client_name: string, event_name: string, event_type: string, command: BdtLpcCommand): Promise<BdtLpcResp> {
        if (!this.m_peers.has(client_name)) {
            this.m_logger.error(`${client_name} not exist`)
            return { err: ErrorCode.notExist };
        }
        let result = await this.m_peers.get(client_name)!.peer!.createBdtLpcListener(event_type, command, async (eventArg) => {
            this.m_interface.fireEvent(`${event_name}`, ErrorCode.succ, eventArg)
        });
        return result;
    }
}



