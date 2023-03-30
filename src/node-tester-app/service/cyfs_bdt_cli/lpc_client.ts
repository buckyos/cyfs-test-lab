import { ErrorCode, Logger, BufferReader, sleep, RandomGenerator } from '../../base';
import * as net from 'net';
import { EventEmitter } from 'events';
import { BdtLpc, BdtLpcCommand, BdtLpcResp } from './lpc';
import * as path from 'path';
import * as fs from 'fs-extra';
import { LpcActionApi } from './action_api';
export type LpcClientOptions = {
    logger: Logger;
    client_name: string
};

export class LpcClient extends EventEmitter {
    private m_logger: Logger;
    public peerid?: string;
    public client_name?: string;
    private m_lpc?: BdtLpc;
    public cache_path: { file_upload: string, file_download: string, NamedObject: string };
    private m_handler: Map<string, (lpc: BdtLpc, c: BdtLpcCommand) => Promise<void>>;
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
    constructor(options: LpcClientOptions) {
        super();
        this.m_logger = options.logger
        this.cache_path = {
            file_upload: path.join(options.logger.dir(), `../${options.client_name}_cache`, "file_upload"),
            file_download: path.join(options.logger.dir(), `../${options.client_name}_cache`, "file_download"),
            NamedObject: path.join(options.logger.dir(), `../${options.client_name}_cache`, "NamedObject")
        }
        fs.mkdirpSync(this.cache_path.file_upload);
        fs.mkdirpSync(this.cache_path.file_download);
        fs.mkdirpSync(this.cache_path.NamedObject);
        fs.mkdirpSync(path.join(this.cache_path.NamedObject, "dir_obj"));
        fs.mkdirpSync(path.join(this.cache_path.NamedObject, "file_obj"));
        fs.mkdirpSync(path.join(this.cache_path.NamedObject, "dir_map"));
        this.client_name = options.client_name;
        this.m_handler = new Map(); // handler list
        this.m_handler.set('ping', async (lpc: BdtLpc, c: BdtLpcCommand) => {
            this.m_latestCommandTimeFromBdt = Date.now();
        });
    }


    initFromLpc(lpc: BdtLpc): ErrorCode {
        this.m_lpc = lpc;
        lpc.on('command', (lpc: BdtLpc, c: BdtLpcCommand) => {
            this.m_logger.info(`recv command from bdt peer, req = ${c.seq}, info=${JSON.stringify(c.json)}`);

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
            if (!this.m_bDestory && (Date.now() - this.m_latestCommandTimeFromBdt > 30 * 1000)) {
                clearInterval(this.m_keepliveTimer!);
                this.m_keepliveTimer = undefined;
                this.emit('unlive');
            }
        }, 5000);

        return ErrorCode.succ;
    }

    private _ping() {
        if (!this.m_lpc) {
            return;
        }

        let command: BdtLpcCommand = {
            bytes: Buffer.from(''),
            json: {
                'PingReq': {},
            }
        };
        this.m_lpc!.send(command);
    }

    async sendBdtLpcCommand(command: BdtLpcCommand): Promise<BdtLpcResp> {
        let { err, resp } = await this.m_lpc!.wait_resp(command);
        this.m_logger.info(`send BdtLpcCommand ${command.json!} err = ${err} , resp = ${JSON.stringify(resp)}`)
        return {
            err: resp!.json.result,
            resp
        };
    }

    async createBdtLpcListener(event_type:string,command: BdtLpcCommand, listener: (eventArg: string) => void): Promise<BdtLpcResp> {
        let { err, resp } = await this.m_lpc!.wait_resp(command);
        this.m_logger.info(`send createBdtLpcListener ${JSON.stringify(command.json)} err = ${err} , resp = ${JSON.stringify(resp)}`)
        if (resp) {
            if (resp.json.result) {
                return { err: ErrorCode.fail,resp };
            } else {
                let onConn = (lpc: BdtLpc, notify: BdtLpcCommand) => {
                    if (resp!.seq! === notify.seq!) {
                        this.m_logger.info(` recv event from bdt-tools`);
                        listener(JSON.stringify(notify.json));
                    }
                };
                this.m_lpc!.on('command', onConn);
                return { err: ErrorCode.succ,resp };
            }
        } else {
            return { err,resp };
        }
    }

}
