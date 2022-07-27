import {ErrorCode, Logger, BufferReader, sleep,RandomGenerator} from '../../base';
import * as net from 'net';
import {EventEmitter} from 'events';
import {BdtLpc, BdtLpcCommand} from './lpc';

export type BdtPeerOptions = {
    logger: Logger;
    name: string
};

export class BdtPeer extends EventEmitter  {
    private m_logger: Logger;
    private m_name: string;
    private m_lpc?: BdtLpc;
    private m_handler: Map<string, (lpc: BdtLpc, c: BdtLpcCommand) => Promise<void>>;
    private m_connIndex: number = 1;
    private m_connMap: Map<string, string>; //本地名称和bdt.exe之间名称的映射
    private m_keepliveTimer?: NodeJS.Timer;
    private m_latestCommandTimeFromBdt: number = 0;
    private m_bDestory: boolean = false;
    
    on(event: 'unlive', listener: () => void): this;
    on(event: string, listener: (...args: any[]) => void): this {
        super.on(event, listener);
        return this;
    }

    once(event: 'unlive', listener: () => void): this;
    once(event: string, listener: (...args: any[]) => void): this {
        super.once(event, listener);
        return this;
    }
    constructor(options: BdtPeerOptions) {
        super();
        this.m_logger = options.logger
        this.m_name = options.name;
        this.m_handler = new Map();
        this.m_connMap = new Map();

        this.m_handler.set('ping', async (lpc: BdtLpc, c: BdtLpcCommand) => {
            this.m_latestCommandTimeFromBdt = Date.now();
        });
    }

    get name(): string {
        return this.m_name;
    }

    initFromLpc(lpc: BdtLpc): ErrorCode {
        this.m_lpc = lpc;
        lpc.on('command', (lpc: BdtLpc, c: BdtLpcCommand) => {
            this.m_logger.info(`recv command from bdt peer, req = ${c.seq},name=${c.json.name}, info=${JSON.stringify(c.json)}`);
            
            if (this.m_handler.get(c.json.name)) {
                this.m_handler.get(c.json.name)!(lpc, c);
            }
        });

        lpc.once('close', () => {
            this.m_lpc = undefined;
        });

        lpc.once('error', () => {
            this.m_lpc = undefined;
        });

        this.m_latestCommandTimeFromBdt = Date.now();
        this.m_keepliveTimer = setInterval(() => {
            this._ping();
            if (!this.m_bDestory && (Date.now() - this.m_latestCommandTimeFromBdt > 5 * 60* 1000)) {
                clearInterval(this.m_keepliveTimer!);
                this.m_keepliveTimer = undefined;
                this.emit('unlive');
            }
        }, 2000);

        return ErrorCode.succ;
    }

    private _ping() {
        if (!this.m_lpc) {
            return;
        }

        let command: BdtLpcCommand = {
            bytes: Buffer.from(''),
            json: {
                name: 'ping',
            }
        };
        this.m_lpc!.send(command);
    }
    
    async create(addrInfo: string[], known_peer_info: Buffer, snFiles: string[], local: string,activePnFiles?:Array<string>, passivePnFiles?:Array<string>,knownPeerFiles?:Array<string>,chunk_cache?:string,ep_type?:string): Promise<{err: ErrorCode, peerinfo?: Buffer, peerid?: string,ep_info?:string,ep_resp?:string}> {
        let command: BdtLpcCommand = {
            bytes: known_peer_info,
            json: {
                name: 'create',
                addrInfo,
                sn_files: snFiles,
                active_pn_files: activePnFiles, 
                passive_pn_files: passivePnFiles,
                known_peer_files:knownPeerFiles, 
                local,
                chunk_cache,
                ep_type
            }
        };
        let lpc = this.m_lpc!;
        let {err, resp} = await lpc.wait_resp(command);
        this.m_logger.info(`create peer err = ${err} , resp = ${JSON.stringify(resp)}`)
        if (resp) {
            if (resp.json.result != 0) {
                return {err: resp.json.result};
            } else {
                return {err: ErrorCode.succ, peerinfo: resp.bytes, peerid: resp.json.id,ep_info: JSON.stringify(resp.json.ep_info) ,ep_resp: JSON.stringify(resp.json.ep_resp) };
            }
        } else {
            return {err};
        }
    }

    async destory(): Promise<{err: ErrorCode}> {
        this.m_bDestory = true;
        let command: BdtLpcCommand = {
            bytes: Buffer.from(''),
            json: {
                name: 'exit',
            }
        };
        let lpc = this.m_lpc!;
        let err = lpc.send(command);
        if (err) {
            return {err};
        }

        return {err: ErrorCode.succ};
    }

    async connect(remote: Buffer, question: string, known_eps: boolean,accept_answer:boolean ,remote_sn?: string): Promise<{err: ErrorCode, connName?: string,time?:number,answer?:string}> {
        let command: BdtLpcCommand = {
            bytes: remote,
            json: {
                name: 'connect',
                question,
                known_eps: known_eps?1:0,
                remote_sn,
                accept_answer : accept_answer?1:0,
            }
        };
       
        let {err, resp: c} = await this.m_lpc!.wait_resp(command);
        if (c) {
            if (c.json.result != 0) {
                return {err: c.json.result};
            } else {
                this.m_connMap.set(c.json.stream_name, c.json.stream_name);
                return {err: ErrorCode.succ, connName: c.json.stream_name,time:c.json.time};
            }
        } else {
            return {err};
        }
    }

    async autoAccept(listener: (connName: string,name:string,question:string) => void,answer?:string): Promise<{err: ErrorCode}> {
        let command: BdtLpcCommand = {
            bytes: Buffer.from(''),
            json: {
                name: 'auto_accept',
                answer : answer
            }
        };

        let {err, resp} = await this.m_lpc!.wait_resp(command);
        if (resp) {
            if (resp.json.result) {
                return {err: ErrorCode.fail};
            } else {
                let onConn = (lpc: BdtLpc, notify: BdtLpcCommand) => {
                    if (notify.json.name === 'confirm_resp' && resp!.seq! === notify.seq! ) {
                        this.m_connMap.set(notify.json.stream_name, notify.json.stream_name);
                        this.m_logger.info(`confirm_resp = ${JSON.stringify(notify.json)}`);
                        listener(notify.json.stream_name,this.name,notify.json.question);
                    }
                };
                this.m_lpc!.on('command', onConn);
                return {err: ErrorCode.succ};
            }
        } else {
            return {err};
        }
    }
    
    async accept(): Promise<{err: ErrorCode, question?: string, connName?: string}> {
        let command: BdtLpcCommand = {
            bytes: Buffer.from(''),
            json: {
                name: 'accept',
            }
        };
        let {err, resp: c} = await this.m_lpc!.wait_resp(command);
        if (c) {
            if (c.json.result) {
                return {err: ErrorCode.fail};
            } else {
                this.m_connMap.set(c.json.stream_name, c.json.stream_name);
                return {err: ErrorCode.succ, question: c.json.question, connName: c.json.stream_name};
            }
        } else {
            return {err};
        }
    }

    async confirm(connName: string, answer: string): Promise<{err: ErrorCode}> {
        let command: BdtLpcCommand = {
            bytes: Buffer.from(''),
            json: {
                name: 'confirm',
                stream_name: connName,
                answer,
            }
        };
        let {err, resp: c} = await this.m_lpc!.wait_resp(command);
        if (c) {
            if (c.json.result) {
                return {err: ErrorCode.fail};
            } else {
                return {err: ErrorCode.succ};
            }
        } else {
            return {err};
        }
    }
    async set_answer(answer: string): Promise<{err: ErrorCode}> {
        let command: BdtLpcCommand = {
            bytes: Buffer.from(''),
            json: {
                name: 'set_answer',
                answer,
            }
        };
        let {err, resp: c} = await this.m_lpc!.wait_resp(command);
        if (c) {
            if (c.json.result) {
                return {err: ErrorCode.fail};
            } else {
                return {err: ErrorCode.succ};
            }
        } else {
            return {err};
        }
    }
    async close(connName: string, which: string): Promise<{err: ErrorCode}> {
        let command: BdtLpcCommand = {
            bytes: Buffer.from(''),
            json: {
                name: 'close',
                stream_name: connName,
                which,
            }
        };
        let {err, resp: c} = await this.m_lpc!.wait_resp(command);
        if (c) {
            if (c.json.result) {
                return {err: ErrorCode.fail};
            } else {
                return {err: ErrorCode.succ};
            }
        } else {
            return {err};
        }
    }

    async reset(connName: string): Promise<{err: ErrorCode}> {
        let command: BdtLpcCommand = {
            bytes: Buffer.from(''),
            json: {
                name: 'reset',
                stream_name: connName,
            }
        };

        let {err, resp: c} = await this.m_lpc!.wait_resp(command);
        if (c) {
            if (c.json.result) {
                return {err: ErrorCode.fail};
            } else {
                return {err: ErrorCode.succ};
            }
        } else {
            return {err};
        }
    }

    async send(connName: string, fileSize: number): Promise<{err: ErrorCode, time?: number, hash?: string}> {
        if (!this.m_connMap.has(connName)) {
            return {err: ErrorCode.notExist};
        }

        let command: BdtLpcCommand = {
            bytes: Buffer.from(''),
            json: {
                name: 'send',
                stream_name: connName,
                size: fileSize,
            }
        };

        let {err, resp: c} = await this.m_lpc!.wait_resp(command);
        if (c) {
            if (c.json.result) {
                return {err: ErrorCode.fail};
            } else {
                return {err: ErrorCode.succ, time: c.json.time, hash: c.json.hash};
            }
        } else {
            return {err};
        }
    }

    async recv(connName: string): Promise<{err: ErrorCode, size?: number, hash?: string}> {
        if (!this.m_connMap.has(connName)) {
            return {err: ErrorCode.notExist};
        }

        let command: BdtLpcCommand = {
            bytes: Buffer.from(''),
            json: {
                name: 'recv',
                stream_name: connName,
            }
        };

        let {err, resp: c} = await this.m_lpc!.wait_resp(command);
        if (c) {
            if (c.json.result) {
                return {err: ErrorCode.fail};
            } else {
                return {err: ErrorCode.succ, size: c.json.file_size, hash: c.json.hash};
            }
        } else {
            return {err};
        }
    }
    async send_object(connName: string, objPath: string,obj_type:number): Promise<{err: ErrorCode, time?: number, hash?: string}> {
        if (!this.m_connMap.has(connName)) {
            return {err: ErrorCode.notExist};
        }

        let command: BdtLpcCommand = {
            bytes: Buffer.from(''),
            json: {
                name: 'send_object',
                stream_name: connName,
                obj_path: objPath,
                obj_type :obj_type
            }
        };

        let {err, resp: c} = await this.m_lpc!.wait_resp(command);
        if (c) {
            if (c.json.result) {
                return {err: ErrorCode.fail};
            } else {
                return {err: ErrorCode.succ, time: c.json.time, hash: c.json.hash};
            }
        } else {
            return {err};
        }
    }

    async recv_object(connName: string,objPath: string): Promise<{err: ErrorCode, size?: number, hash?: string,object_id?:string}> {
        if (!this.m_connMap.has(connName)) {
            return {err: ErrorCode.notExist};
        }

        let command: BdtLpcCommand = {
            bytes: Buffer.from(''),
            json: {
                name: 'recv_object',
                stream_name: connName,
                obj_path: objPath,
            }
        };

        let {err, resp: c} = await this.m_lpc!.wait_resp(command);
        if (c) {
            if (c.json.result) {
                return {err: ErrorCode.fail};
            } else {
                return {err: ErrorCode.succ, size: c.json.file_size, hash: c.json.hash,object_id:c.json.object_id};
            }
        } else {
            return {err};
        }
    }

    async setChunk(content: Buffer): Promise<{err: ErrorCode, chunkid?: string}> {
        let command: BdtLpcCommand = {
            bytes: content,
            json: {
                name: 'set-chunk'
            }
        };

        let {err, resp: c} = await this.m_lpc!.wait_resp(command);
        if (c) {
            if (c.json.result) {
                return {err: ErrorCode.fail};
            } else {
                return {err: ErrorCode.succ, chunkid: c.json.chunk_id};
            }
        } else {
            return {err};
        }
    }

    async interestChunk(remote: Buffer, chunkid: string): Promise<{err: ErrorCode}> {
        let command: BdtLpcCommand = {
            bytes: remote,
            json: {
                name: 'interest-chunk',
                chunk_id: chunkid
            }
        };

        let {err, resp: c} = await this.m_lpc!.wait_resp(command);
        if (c) {
            if (c.json.result) {
                return {err: ErrorCode.fail};
            } else {
                return {err: ErrorCode.succ};
            }
        } else {
            return {err};
        }
    }
    async interestChunkList(remote: Buffer, chunk_list:  Array<{chunk_id:string}>): Promise<{err: ErrorCode,session?:string}> {
        let command: BdtLpcCommand = {
            bytes: remote,
            json: {
                name: 'interest-chunk-list',
                task_name : `${RandomGenerator.string(10)}`,
                chunk_list,
            }
        };

        let {err, resp: c} = await this.m_lpc!.wait_resp(command);
        if (c) {
            if (c.json.result) {
                return {err: ErrorCode.fail};
            } else {
                return {err: ErrorCode.succ,session:c.json.session};
            }
        } else {
            return {err};
        }
    }

    async checkChunk(chunkid: string): Promise<{err: ErrorCode, state?: string}> {
        let command: BdtLpcCommand = {
            bytes: Buffer.from(''),
            json: {
                name: 'check-chunk',
                chunk_id: chunkid
            }
        };
        let {err, resp: c} = await this.m_lpc!.wait_resp(command);
        if (c) {
            if (c.json.result) {
                return {err: ErrorCode.fail};
            } else {
                return {err: ErrorCode.succ, state: c.json.state};
            }
        } else {
            return {err};
        }
    }
    async checkChunkList(session: string): Promise<{err: ErrorCode, state?: string}> {
        let command: BdtLpcCommand = {
            bytes: Buffer.from(''),
            json: {
                name: 'check-chunk-list',
                session,
            }
        };
        let {err, resp: c} = await this.m_lpc!.wait_resp(command);
        if (c) {
            if (c.json.result) {
                return {err: ErrorCode.fail};
            } else {
                return {err: ErrorCode.succ, state: c.json.state};
            }
        } else {
            return {err};
        }
    }

  /*
        params:
            path： 文件路径；如果是上传方，这个路径应当已经存在；如果是下载方，测试结束的时候这个路径应当由文件
            defaultHub: file owner's ood device id
            file: 如果是上传方，不需要传入；如果是下载方，传入上传方调用 createFileSession返回的 file
        return:
            session: 生成的session id；用于后续接口的调用
            file：生成的file object;用于下载方调用createFileSession
    */
   async createFileSession(defaultHub: string, path: string, file?: Buffer): Promise<{err: ErrorCode, session?: string, file?: Buffer}> {
    let command: BdtLpcCommand = {
        bytes: file ? file : Buffer.from(''),
        json: {
            name: 'create-file-session', 
            default_hub: defaultHub, 
            path
        }
    };
    let {err, resp: c} = await this.m_lpc!.wait_resp(command);
    if (c) {
        return {
            err: ErrorCode.succ, 
            session: c.json.session, 
            file: c.bytes
        };
    } else {
        return {err};
    }
}

/*
params:
    session: createFileSession 返回的sessioin id
return:
    state: 以下三种值：
        "Pending": 还没有开始
        "OnAir(percent)": 正在下载，percent是进度百分比
        "Ready": 下载完成
*/
async startTransSession(session: string, options?: {enable_upload: boolean}): Promise<{err: ErrorCode, state?: string}> {
    let command: BdtLpcCommand = {
        bytes: Buffer.from(''),
        json: {
            name: 'start-trans-session', 
            session, 
            options
        }
    };
    let {err, resp: c} = await this.m_lpc!.wait_resp(command);
    if (c) {
        if (c.json.result) {
            return {err: ErrorCode.fail};
        } else {
            return {err: ErrorCode.succ, state: c.json.state};
        }
    } else {
        return {err};
    }
}


/*
params:
    session: createFileSession 返回的sessioin id
return:
    state: 以下三种值：
        "Pending": 还没有开始
        "OnAir(percent)": 正在下载，percent是进度百分比
        "Ready": 下载完成
*/
async getTransSessionState(session: string): Promise<{err: ErrorCode, state?: string}> {
    let command: BdtLpcCommand = {
        bytes: Buffer.from(''),
        json: {
            name: 'get-trans-session-state', 
            session
        }
    };
    let {err, resp: c} = await this.m_lpc!.wait_resp(command);
    if (c) {
        if (c.json.result) {
            return {err: ErrorCode.fail};
        } else {
            return {err: ErrorCode.succ, state: c.json.state};
        }
    } else {
        return {err};
    }
}

    /*
        向peer的device cache添加device object；用于向这个device 发起连接
        params：
            device： Device Object 从server下发
    */
async addDevice(device: Buffer): Promise<{err: ErrorCode}> {
    let command: BdtLpcCommand = {
        bytes: device,
        json: {
            name: 'add-device', 
        }
    };

    let {err, resp: c} = await this.m_lpc!.wait_resp(command);
    if (c) {
        if (c.json.result) {
            return {err: ErrorCode.fail};
        } else {
            return {err: ErrorCode.succ};
        }
    } else {
        return {err};
    }
}

async startSendFile(path: string,chunkSize?:number): Promise<{err: ErrorCode, session?: string, file?: Buffer}> {
    let command: BdtLpcCommand = {
        bytes: Buffer.from(''),
        json: {
            name: 'start-send-file', 
            path:path,
            chunk_size_mb:chunkSize
        }
    };
    let {err, resp: c} = await this.m_lpc!.wait_resp(command);
    if (c) {
        return {
            err: ErrorCode.succ, 
            session: c.json.session, 
            file: c.bytes
        };
    } else {
        return {err};
    }
}
async startDownloadFile(remote:string,path: string,file: Buffer,secondPeerId?:string): Promise<{err: ErrorCode, session?: string, file?: Buffer}> {
    let command: BdtLpcCommand = {
        bytes: file ? file : Buffer.from(''),
        json: {
            name: 'start-download-file', 
            path:path,
            file:file,
            peer_id :remote,
            second_peer_id : secondPeerId
        }
    };
    let {err, resp: c} = await this.m_lpc!.wait_resp(command); 
    if (c) {

        return {
            err: ErrorCode.succ, 
            session: c.json.session, 
            file: c.bytes
        };
    } else {
        return {err};
    }
}

async startDownloadFileRange(remote:string,path: string,file: Buffer,ranges?:Array<{begin:number,end:number}>,secondPeerId?:string): Promise<{err: ErrorCode, session?: string, file?: Buffer}> {
    let command: BdtLpcCommand = {
        bytes: file ? file : Buffer.from(''),
        json: {
            name: 'start-download-file-range', 
            path:path,
            file:file,
            peer_id :remote,
            second_peer_id : secondPeerId,
            ranges
        }
    };
    let {err, resp: c} = await this.m_lpc!.wait_resp(command); 
    if (c) {

        return {
            err: ErrorCode.succ, 
            session: c.json.session, 
            file: c.bytes
        };
    } else {
        return {err};
    }
}

async downloadFileState(session: string): Promise<{err: ErrorCode, state?: string}> {
    let command: BdtLpcCommand = {
        bytes: Buffer.from(''),
        json: {
            name: 'download-file-state',
            session: session
        }
    };
    let {err, resp: c} = await this.m_lpc!.wait_resp(command);
    if (c) {
        if (c.json.result) {
            return {err: ErrorCode.fail};
        } else {
            return {err: ErrorCode.succ, state: c.json.state};
        }
    } else {
        return {err};
    }
}

async getSystemInfo(): Promise<{err: ErrorCode, cpu_usage?: number,total_memory?:number,used_memory?:number,received_bytes?:number,
    transmitted_bytes?:number,ssd_disk_total?:number,ssd_disk_avail?:number,hdd_disk_total?:number,hdd_disk_avail?:number}> {
    let command: BdtLpcCommand = {
        bytes: Buffer.from(''),
        json: {
            name: 'get_system_info',
        }
    };
    let {err, resp: c} = await this.m_lpc!.wait_resp(command);
    if (c) {
        if (c.json.result == 0) {
            return {err: ErrorCode.fail};
        } else {
            return {err: ErrorCode.succ,
                cpu_usage: c.json.cpu_usage,
                total_memory: c.json.total_memory,
                used_memory: c.json.used_memory,
                received_bytes: c.json.received_bytes,
                transmitted_bytes: c.json.transmitted_bytes,
                ssd_disk_total: c.json.ssd_disk_total,
                ssd_disk_avail: c.json.ssd_disk_avail,
                hdd_disk_total: c.json.hdd_disk_total,
                hdd_disk_avail: c.json.hdd_disk_avail,};
        }
    } else {
        return {err};
    }
}
 
async startSendDir(path: string,chunkSize:number,dir_object_path:string): Promise<{err: ErrorCode, session?: string, dir_id?: string,dir_object_path?:string,dir_map?:Array<{name:string,file_id:string}>}> {
    let command: BdtLpcCommand = {
        bytes: Buffer.from(''),
        json: {
            name: 'start-send-dir', 
            path:path,
            chunk_size_mb:chunkSize,
            dir_object_path:dir_object_path,
        }
    };
    let {err, resp: c} = await this.m_lpc!.wait_resp(command);
    if (c) {
        return {
            err: ErrorCode.succ, 
            session: c.json.session, 
            dir_object_path : c.json.dir_object_path, 
            dir_map : c.json.dir_map,
            dir_id: c.json.dir_id
        };
    } else {
        return {err};
    }
}
async startDownloadDir(remote:string,path: string,dir_map:Array<{name:string,file_id:string}>,dir_id: string,dir_object_path:string,secondPeerId?:string): Promise<{err: ErrorCode, session?: string, dir?: Buffer}> {
    let command: BdtLpcCommand = {
        bytes:  Buffer.from(''),
        json: {
            name: 'start-download-dir', 
            path:path,
            dir_object_path,
            peer_id :remote,
            dir_map :dir_map,
            dir_id :dir_id,
            second_peer_id : secondPeerId
        }
    };
    let {err, resp: c} = await this.m_lpc!.wait_resp(command); 
    if (c) {

        return {
            err: ErrorCode.succ, 
            session: c.json.session, 
            dir: c.bytes
        };
    } else {
        return {err};
    }
}
async downloadDirState(session: string): Promise<{err: ErrorCode, state?: string}> {
    let command: BdtLpcCommand = {
        bytes: Buffer.from(''),
        json: {
            name: 'download-dir-state',
            session: session
        }
    };
    let {err, resp: c} = await this.m_lpc!.wait_resp(command);
    if (c) {
        if (c.json.result) {
            return {err: ErrorCode.fail};
        } else {
            return {err: ErrorCode.succ, state: c.json.state};
        }
    } else {
        return {err};
    }
}



}
