"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LpcClient = void 0;
const common_1 = require("../../common");
const events_1 = require("events");
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
class LpcClient extends events_1.EventEmitter {
    constructor(options) {
        super();
        this.m_latestCommandTimeFromBdt = 0;
        this.m_bDestory = false;
        this.m_logger = options.logger;
        this.cache_path = {
            file_upload: path.join(options.logger.dir(), `../${options.client_name}_cache`, "file_upload"),
            file_download: path.join(options.logger.dir(), `../${options.client_name}_cache`, "file_download"),
            NamedObject: path.join(options.logger.dir(), `../${options.client_name}_cache`, "NamedObject")
        };
        fs.mkdirpSync(this.cache_path.file_upload);
        fs.mkdirpSync(this.cache_path.file_download);
        fs.mkdirpSync(this.cache_path.NamedObject);
        fs.mkdirpSync(path.join(this.cache_path.NamedObject, "dir_obj"));
        fs.mkdirpSync(path.join(this.cache_path.NamedObject, "file_obj"));
        fs.mkdirpSync(path.join(this.cache_path.NamedObject, "dir_map"));
        this.client_name = options.client_name;
        this.m_handler = new Map(); // handler list
        this.m_handler.set('ping', async (lpc, c) => {
            this.m_latestCommandTimeFromBdt = Date.now();
        });
    }
    on(event, listener) {
        super.on(event, listener);
        return this;
    }
    once(event, listener) {
        super.once(event, listener);
        return this;
    }
    initFromLpc(lpc) {
        this.m_lpc = lpc;
        lpc.on('command', (lpc, c) => {
            this.m_logger.info(`recv command from bdt peer, req = ${c.seq},name=${c.json.name}, info=${JSON.stringify(c.json)}`);
            if (this.m_handler.get(c.json.name)) {
                this.m_handler.get(c.json.name)(lpc, c);
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
            if (!this.m_bDestory && (Date.now() - this.m_latestCommandTimeFromBdt > 5 * 60 * 1000)) {
                clearInterval(this.m_keepliveTimer);
                this.m_keepliveTimer = undefined;
                this.emit('unlive');
            }
        }, 10000);
        return common_1.ErrorCode.succ;
    }
    _ping() {
        if (!this.m_lpc) {
            return;
        }
        let command = {
            bytes: Buffer.from(''),
            json: {
                'PingReq': {},
            }
        };
        this.m_lpc.send(command);
    }
    async sendBdtLpcCommand(command) {
        let { err, resp } = await this.m_lpc.wait_resp(command);
        this.m_logger.info(`send BdtLpcCommand ${command.json} err = ${err} , resp = ${JSON.stringify(resp)}`);
        return {
            err: resp.json.result,
            resp
        };
    }
    async createBdtLpcListener(command, listener) {
        let { err, resp } = await this.m_lpc.wait_resp(command);
        this.m_logger.info(`send BdtLpcCommand ${command.json} err = ${err} , resp = ${JSON.stringify(resp)}`);
        if (resp) {
            if (resp.json.result) {
                return { err: common_1.ErrorCode.fail };
            }
            else {
                let onConn = (lpc, notify) => {
                    listener(JSON.stringify(notify.json));
                };
                this.m_lpc.on('command', onConn);
                return { err: common_1.ErrorCode.succ };
            }
        }
        else {
            return { err };
        }
    }
}
exports.LpcClient = LpcClient;
