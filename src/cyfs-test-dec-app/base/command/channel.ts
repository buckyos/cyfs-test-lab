import { Command, NamespaceHelper, Rpc, Namespace, stringifyComand,  } from "../command";
import { Logger } from "../common/log";
import { EventEmitter } from "events";
import { CommandDispatch } from "./dispatch";
import { ErrorCode } from "../common/errcode";

export type ChannelOptions = {
    namespace: Namespace;
    logger: Logger;
    timeout: number;
};

export type ChannelHooker = (c: Command)=>boolean;

export type HookEntry = {
    from?: Namespace;
    to?: Namespace;
    hookers: ChannelHooker[];
};

export class Channel extends EventEmitter {
    private m_namesapce: Namespace;
    private m_logger: Logger;
    private m_rpc?: Rpc;
    private m_timeout: number;
    private m_timeoutTimer?: NodeJS.Timer;
    private m_lastSendTime: number = 0;
    private m_hookers: HookEntry[];
    private m_sendingCommandsPreConnect: Command[];

    on(event: 'command', listener: (client: Channel, c: Command) => void): this;
    on(event: 'timeout', listener: (client: Channel) => void): this;
    on(event: string, listener: (...args: any[]) => void): this {
        super.on(event, listener);
        return this;
    }

    once(event: 'command', listener: (client: Channel, c: Command) => void): this;
    once(event: 'timeout', listener: (client: Channel) => void): this;
    once(event: string, listener: (...args: any[]) => void): this {
        super.on(event, listener);
        return this;
    }

    constructor (options: ChannelOptions) {
        super();
        this.m_timeout = 24*60*60*1000;
        this.m_namesapce = options.namespace;
        this.m_logger = options.logger;
        this.m_hookers = [];
        this.m_sendingCommandsPreConnect = [];
    }

    get lastSendTime(): number {
        return this.m_lastSendTime;
    }

    get namespace(): Namespace {
        return this.m_namesapce;
    }

    get logger(): Logger {
        return this.m_logger;
    }

    get timeout(): number {
        return this.m_timeout;
    }

    get isService(): boolean {
        return !this.namespace.taskid;
    }

    get isVirtual(): boolean {
        return !this.m_rpc;
    }

    send(c: Command) {
        if (this.m_rpc) {
            this.m_rpc!.send(c);
        } else {
            this.m_sendingCommandsPreConnect.push(c);
        }
    }

    initFromRpc(rpc: Rpc) {
        this._updateTimer();

        if(this.m_rpc) {
            this.m_rpc.removeAllListeners('command');
        }

        this.m_rpc = rpc;
        rpc.on('command', (r: Rpc, c: Command) => {
            this.m_logger.info(`recv command from rpc, ${stringifyComand(c)} namespace=${JSON.stringify(this.namespace)}`);
            this._onRecvCommand(c);
        });

        rpc.on('close', (r: Rpc) => {
            if (this.m_rpc === r) {
                this._onExit();
                delete this.m_rpc;
            }
        });

        rpc.on('error', (r: Rpc) => {
            if (this.m_rpc === r) {
                this._onExit();
                delete this.m_rpc;
            }
        });

        let cacheCommands: Command[] = this.m_sendingCommandsPreConnect;
        this.m_sendingCommandsPreConnect = [];
        for (let cmd of cacheCommands) {
            rpc.send(cmd);
        }
    }

    destory() {
        if (this.m_timeoutTimer) {
            clearTimeout(this.m_timeoutTimer);
            delete this.m_timeoutTimer;
        }
    }

    addHooker(pair: {from?: Namespace; to?: Namespace}, handler: ChannelHooker): ErrorCode {
        if (!pair.from && !pair.to) {
            return ErrorCode.invalidParam;
        }

        let entry = this._findHookEntry(pair);
        if (!entry) {
            entry = {from: pair.from, to: pair.to, hookers: []};
            this.m_hookers.push(entry);
        }
        entry.hookers.push(handler);
        return ErrorCode.succ;
    }

    removeHooker(pair: {from?: Namespace; to?: Namespace}, handler: ChannelHooker): ErrorCode {
        if (!pair.from && !pair.to) {
            return ErrorCode.invalidParam;
        }

        let entry = this._findHookEntry(pair);
        if (!entry) {
            return ErrorCode.notExist;
        }

        let index = entry.hookers.indexOf(handler);
        if (index === -1) {
            return ErrorCode.notExist;
        }
        entry.hookers.splice(index, 1);

        if (entry.hookers.length) {
            this.m_hookers.splice(this.m_hookers.indexOf(entry), 1);
        }

        return ErrorCode.succ;
    }

    protected _onRecvCommand(c: Command): boolean {
        this._updateTimer();

        let entry = this._findHookEntry({from: c.from, to: c.to});
        if (entry) {
            let hookers = entry.hookers.slice();
            for (let handler of hookers) {
                if (handler(c)) {
                    return true;
                }
            }
        }
        
        this.emit('command', this, c);

        return true;
    }

    protected _updateTimer() {
        if (this.m_timeout === 0) {
            return;
        }

        if (this.m_timeoutTimer) {
            clearTimeout(this.m_timeoutTimer);
        }

        this.m_timeoutTimer = setTimeout(() => {
            this.m_logger.info(`----------channel timeout, namespace=${JSON.stringify(this.namespace)}`);
            delete this.m_timeoutTimer;
            this._onExit();
        }, this.m_timeout);
    }

    protected _onExit() {
        this.emit('timeout', this);
    }

    protected _findHookEntry(pair: {from?: Namespace; to?: Namespace}): HookEntry | null {
        for (let entry of this.m_hookers) {
            if (pair.from) {
                if (!entry.from) {
                    continue;
                }

                if (!NamespaceHelper.isNamespaceEqual(entry.from!, pair.from!)) {
                    continue;
                }
            }
            

            if (pair.to) {
                if (!entry.to) {
                    continue;
                }

                if (!NamespaceHelper.isNamespaceEqual(entry.to!, pair.to!)) {
                    continue;
                }
            }
            
            return entry;
        }

        return null;
    }
}