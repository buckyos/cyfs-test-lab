import { ErrorCode, Logger, BufferReader, sleep, RandomGenerator } from '../../base';
import * as net from 'net';
import { EventEmitter } from 'events';
import { StackLpc, StackLpcCommand } from './lpc';
import * as WSParams from "./ws_params"
export type StackPeerOptions = {
    logger: Logger;
    name: string
};

export class StackPeer extends EventEmitter {
    private m_logger: Logger;
    private m_name: string;
    private m_lpc?: StackLpc;
    private m_handler: Map<string, (lpc: StackLpc, c: StackLpcCommand) => Promise<void>>;
    private m_connIndex: number = 1;
    private m_connMap: Map<string, string>; //本地名称和Stack.exe之间名称的映射
    private m_keepliveTimer?: NodeJS.Timer;
    private m_latestCommandTimeFromStack: number = 0;
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
    constructor(options: StackPeerOptions) {
        super();
        this.m_logger = options.logger
        this.m_name = options.name;
        this.m_handler = new Map();
        this.m_connMap = new Map();

        this.m_handler.set('ping', async (lpc: StackLpc, c: StackLpcCommand) => {
            this.m_latestCommandTimeFromStack = Date.now();
        });
    }

    get name(): string {
        return this.m_name;
    }

    initFromLpc(lpc: StackLpc): ErrorCode {
        this.m_lpc = lpc;
        lpc.on('command', (lpc: StackLpc, c: StackLpcCommand) => {
            this.m_logger.info(`recv command from Stack peer, req = ${c.seq},name=${c.json.name}, info=${JSON.stringify(c.json)}`);

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

        this.m_latestCommandTimeFromStack = Date.now();
        this.m_keepliveTimer = setInterval(() => {
            this._ping();
            if (!this.m_bDestory && (Date.now() - this.m_latestCommandTimeFromStack > 5 * 60 * 1000)) {
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

        let command: StackLpcCommand = {
            bytes: Buffer.from(''),
            json: {
                name: 'ping',
            }
        };
        this.m_lpc!.send(command);
    }

    async open_stack(stack_type: string, dec_id?: string, http_port?: number, ws_port?: number): Promise<{ err: ErrorCode, deviceId?: string, log?: string }> {
        let command: StackLpcCommand = {
            bytes: Buffer.from(''),
            json: {
                name: 'open_stack',
                stack_type,
                dec_id,
                http_port,
                ws_port
            }
        };
        let lpc = this.m_lpc!;
        let { err, resp } = await lpc.wait_resp(command);
        this.m_logger.info(`open_stack err = ${err} , resp = ${JSON.stringify(resp)}`)
        if (resp) {
            if (resp.json.result != 0) {
                return { err: resp.json.result };
            } else {
                return { err: ErrorCode.succ, deviceId: resp.json.deviceId, log: resp.json.log };
            }
        } else {
            return { err };
        }
    }

    async put_obejct(obj_type: number, put_object_params: WSParams.PutObjectParmas): Promise<WSParams.PutObjectResp> {
        let command: StackLpcCommand = {
            bytes: Buffer.from(''),
            json: {
                name: 'put_obejct',
                obj_type,
                put_object_params,
            }
        };
        let lpc = this.m_lpc!;
        let { err, resp } = await lpc.wait_resp(command);
        this.m_logger.info(`put_obejct err = ${err} , resp = ${JSON.stringify(resp)}`)
        if (resp) {
            if (resp.json.result != 0) {
                return { err: resp.json.result };
            } else {
                return { err: ErrorCode.succ, log: resp.json.log, object_id: resp.json.object_id, object_raw: resp.bytes };
            }
        } else {
            return { err };
        }
    }

    async get_obejct(obj_type: number, get_object_params: WSParams.GetObjectParmas): Promise<WSParams.GetObjectResp> {
        let command: StackLpcCommand = {
            bytes: Buffer.from(''),
            json: {
                name: 'get_obejct',
                obj_type,
                get_object_params,
            }
        };
        let lpc = this.m_lpc!;
        let { err, resp } = await lpc.wait_resp(command);
        this.m_logger.info(`get_obejct err = ${err} , resp = ${JSON.stringify(resp)}`)
        if (resp) {
            if (resp.json.result != 0) {
                return { err: resp.json.result };
            } else {
                return { err: ErrorCode.succ, object_raw: resp.json.object_raw, log: resp.json.log, object_id: resp.json.object_id };
            }
        } else {
            return { err };
        }
    }

    async forward(obj_type: number, forward_params: WSParams.ForwardRequest): Promise<WSParams.ForwardResponse> {
        let command: StackLpcCommand = {
            bytes: Buffer.from(''),
            json: {
                name: forward_params.message_type,
                obj_type,
                forward_params,
            }
        };
        let lpc = this.m_lpc!;
        let { err, resp } = await lpc.wait_resp(command);
        this.m_logger.info(`put_obejct err = ${err} , resp = ${JSON.stringify(resp)}`)
        if (resp) {
            if (resp.json.result != 0) {
                return { err: resp.json.result };
            } else {
                return { err: ErrorCode.succ, log: resp.json.log, resp: resp.bytes };
            }
        } else {
            return { err };
        }
    }

    async destory(): Promise<{ err: ErrorCode }> {
        this.m_bDestory = true;
        let command: StackLpcCommand = {
            bytes: Buffer.from(''),
            json: {
                name: 'exit',
            }
        };
        let lpc = this.m_lpc!;
        let err = lpc.send(command);
        if (err) {
            return { err };
        }

        return { err: ErrorCode.succ };
    }



}
