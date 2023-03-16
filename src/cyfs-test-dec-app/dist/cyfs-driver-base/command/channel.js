"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Channel = void 0;
const command_1 = require("../command");
const events_1 = require("events");
const errcode_1 = require("../../common/errcode");
class Channel extends events_1.EventEmitter {
    constructor(options) {
        super();
        this.m_lastSendTime = 0;
        this.m_timeout = 24 * 60 * 60 * 1000;
        this.m_namesapce = options.namespace;
        this.m_logger = options.logger;
        this.m_hookers = [];
        this.m_sendingCommandsPreConnect = [];
    }
    on(event, listener) {
        super.on(event, listener);
        return this;
    }
    once(event, listener) {
        super.on(event, listener);
        return this;
    }
    get lastSendTime() {
        return this.m_lastSendTime;
    }
    get namespace() {
        return this.m_namesapce;
    }
    get logger() {
        return this.m_logger;
    }
    get timeout() {
        return this.m_timeout;
    }
    get isService() {
        return !this.namespace.taskid;
    }
    get isVirtual() {
        return !this.m_rpc;
    }
    send(c) {
        if (this.m_rpc) {
            this.m_rpc.send(c);
        }
        else {
            this.m_sendingCommandsPreConnect.push(c);
        }
    }
    initFromRpc(rpc) {
        this._updateTimer();
        if (this.m_rpc) {
            this.m_rpc.removeAllListeners('command');
        }
        this.m_rpc = rpc;
        rpc.on('command', (r, c) => {
            this.m_logger.info(`recv command from rpc, ${command_1.stringifyComand(c)} namespace=${JSON.stringify(this.namespace)}`);
            this._onRecvCommand(c);
        });
        rpc.on('close', (r) => {
            if (this.m_rpc === r) {
                this._onExit();
                delete this.m_rpc;
            }
        });
        rpc.on('error', (r) => {
            if (this.m_rpc === r) {
                this._onExit();
                delete this.m_rpc;
            }
        });
        let cacheCommands = this.m_sendingCommandsPreConnect;
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
    addHooker(pair, handler) {
        if (!pair.from && !pair.to) {
            return errcode_1.ErrorCode.invalidParam;
        }
        let entry = this._findHookEntry(pair);
        if (!entry) {
            entry = { from: pair.from, to: pair.to, hookers: [] };
            this.m_hookers.push(entry);
        }
        entry.hookers.push(handler);
        return errcode_1.ErrorCode.succ;
    }
    removeHooker(pair, handler) {
        if (!pair.from && !pair.to) {
            return errcode_1.ErrorCode.invalidParam;
        }
        let entry = this._findHookEntry(pair);
        if (!entry) {
            return errcode_1.ErrorCode.notExist;
        }
        let index = entry.hookers.indexOf(handler);
        if (index === -1) {
            return errcode_1.ErrorCode.notExist;
        }
        entry.hookers.splice(index, 1);
        if (entry.hookers.length) {
            this.m_hookers.splice(this.m_hookers.indexOf(entry), 1);
        }
        return errcode_1.ErrorCode.succ;
    }
    _onRecvCommand(c) {
        this._updateTimer();
        let entry = this._findHookEntry({ from: c.from, to: c.to });
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
    _updateTimer() {
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
    _onExit() {
        this.emit('timeout', this);
    }
    _findHookEntry(pair) {
        for (let entry of this.m_hookers) {
            if (pair.from) {
                if (!entry.from) {
                    continue;
                }
                if (!command_1.NamespaceHelper.isNamespaceEqual(entry.from, pair.from)) {
                    continue;
                }
            }
            if (pair.to) {
                if (!entry.to) {
                    continue;
                }
                if (!command_1.NamespaceHelper.isNamespaceEqual(entry.to, pair.to)) {
                    continue;
                }
            }
            return entry;
        }
        return null;
    }
}
exports.Channel = Channel;
