import { ErrorCode, Namespace, Logger, ServiceClientInterface, RandomGenerator } from '../../base';
import * as net from 'net';
import { EventEmitter } from 'events';
import {UtilTool} from "./util"
import { BdtLpc, BdtLpcCommand ,BdtLpcResp} from './lpc';


export function Uint8ArrayToString(fileData: Uint8Array) {
    var dataString = "";
    for (var i = 0; i < fileData.length; i++) {
        dataString += String.fromCharCode(fileData[i]);
    }
    return dataString
}
export function stringToUint8Array(str: string) {
    var arr = [];
    for (var i = 0, j = str.length; i < j; ++i) {
        arr.push(str.charCodeAt(i));
    }
    var tmpUint8Array = new Uint8Array(arr);
    return tmpUint8Array
}

export class ProxyManager extends EventEmitter {
    private stack_type?: string;
    private log: Logger;
    private m_interface: ServiceClientInterface;
    private stack_http_port?: number;
    private stack_ws_port?: number;
    private utilTool? : UtilTool;
    public cache_path : {file_upload:string,file_download:string,NamedObject:string};
    //本地socket 代理池 seq : SDK 到 协议栈序列号 , r_seq 协议栈到SDK序列号
    private socketList: Array<{ socket: net.Socket, type: string, remoteAddress: string, remotePort: number, seq?: number, r_seq?: number }>;
    private peerName: string;
    private state: number; // 0 未初始 1 初始化中 2 可使用 -1 销毁
    on(event: string, listener: (...args: any[]) => void): this {
        super.on(event, listener);
        return this;
    }
    once(event: string, listener: (...args: any[]) => void): this {
        super.once(event, listener);
        return this;
    }
    constructor(_interface: ServiceClientInterface) {
        super();
        this.m_interface = _interface;
        this.log = _interface.getLogger();
        this.peerName = RandomGenerator.string(10);
        this.state = 0;
        this.socketList = [];
        this.utilTool = new UtilTool(_interface,this.log);
        this.cache_path = {
            file_upload:path.join(options.logger.dir(),`../${options.peer_name}_cache`,"file_upload"),
            file_download:path.join(options.logger.dir(),`../${options.peer_name}_cache`,"file_download"),
            NamedObject:path.join(options.logger.dir(),`../${options.peer_name}_cache`,"NamedObject")
        }
    }
    init(stack_type: string): { err: ErrorCode, log?: string } {
        this.log.info(`init cyfs stack ProxyManager type =${stack_type}`)
        this.stack_type = stack_type;
        if (stack_type == "runtime") {
            this.stack_http_port = 1322;
            this.stack_ws_port = 1323;
        } else if (stack_type == "ood") {
            this.stack_http_port = 1318;
            this.stack_ws_port = 1319;
        }
        
        fs.mkdirpSync(this.cache_path.file_upload);
        fs.mkdirpSync(this.cache_path.file_download);
        fs.mkdirpSync(this.cache_path.NamedObject);
        return { err: ErrorCode.succ, log: "start success" }
    }
    async build_tunnel(type: string, remoteAddress: string, remotePort: number) {
        let port = this.stack_ws_port!
        if (type == "http") {
            port = this.stack_http_port!
        } else if (type == "ws") {
            port = this.stack_ws_port!
        }
        try {
            let client = net.connect(port, "127.0.0.1", () => {
                this.log.info(`${client.remoteAddress}_${client.remotePort} begin connect tcp 127.0.0.1:${port}`)
                this.socketList!.push({
                    type,
                    remoteAddress,
                    remotePort,
                    socket: client,
                    seq: 0,
                    r_seq: 0,
                })
                let r_seq = 0;
                client.setKeepAlive(true,2000)
                client.on('data', async (buf) => {
                    r_seq = r_seq + 1;
                    this.log.info(` ${this.peerName} $ TCP Client ${port} resp stack data ${client.remoteAddress}:${client.remotePort},r_seq = ${r_seq}`);
                    let msg_u8 = buf as Uint8Array;
                    let info = await this.m_interface.fireEvent(`${remoteAddress}_${remotePort}`, ErrorCode.succ, r_seq, Uint8ArrayToString(msg_u8))
                })
            });
            return { err: ErrorCode.succ, log: `proxy client ${client.remoteAddress}_${client.remotePort}` };
        } catch (error) {
            return { err: ErrorCode.exception, log: `${error}` };
        }
    }
    async proxy_data(type: string, remoteAddress: string, remotePort: number, seq: number, bytes: Buffer) {
        for (let i in this.socketList) {
            if (this.socketList[i].type == type && this.socketList[i].remoteAddress == remoteAddress && this.socketList[i].remotePort == remotePort) {
                // 实现序列化发送
                this.socketList[i].socket.write(stringToUint8Array(bytes.toString()));
            }
        }
        return ErrorCode.notFound
    }
    async utilRequest(command:BdtLpcCommand):Promise<BdtLpcResp>{
        return await this.utilTool!.utilRequest(command);
    }
}
