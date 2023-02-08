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
exports.UtilTool = void 0;
const base_1 = require("../../base");
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const CHAR_SET = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz0123456789';
class UtilTool {
    constructor(_interface, logger, root) {
        let cache_path = {
            file_upload: path.join(root, "file_upload"),
            file_download: path.join(root, "file_download"),
        };
        fs.mkdirpSync(cache_path.file_upload);
        fs.mkdirpSync(cache_path.file_download);
        this.m_logger = logger;
        this.m_interface = _interface;
        this.cache_path = cache_path;
    }
    async init_cache() {
        if (!this.cache_mb) {
            this.cache_mb = Buffer.from(this.string(1000000));
        }
        this.cache_kb = Buffer.from(this.string(37));
        this.cahce_buff = Buffer.concat([this.cache_kb, this.cache_mb]);
    }
    string(length = 32) {
        let maxPos = CHAR_SET.length;
        let result = '';
        for (let i = 0; i < length; i++) {
            result += CHAR_SET.charAt(this.integer(maxPos));
        }
        while (Buffer.byteLength(result) < length) {
            result += CHAR_SET.charAt(this.integer(maxPos));
        }
        return result;
    }
    ;
    integer(max, min = 0) {
        let result = Math.round(Math.random() * (max - min)) + min;
        if (result > max) {
            result = max;
        }
        return result;
    }
    async util_request(command) {
        if (!command.json.name) {
            return { err: base_1.ErrorCode.notFound };
        }
        switch (command.json.name) {
            case "create_file":
                {
                    return await this.create_file(command);
                }
                ;
            case "create_dir":
                {
                    return await this.create_dir(command);
                }
                ;
            case "md5":
                {
                    return await this.md5(command);
                }
                ;
            case "get_IP_info":
                {
                    return await this.get_IP_info(command);
                }
                ;
            case "upload_log":
                {
                    return await this.upload_log(command);
                }
                ;
            case "get_cache_path": {
                return await this.get_cache_path(command);
            }
        }
        this.m_logger.info(`#### not found utilRequest req_path `);
        return { err: base_1.ErrorCode.notFound };
    }
    async _createFile(file_path, file_size) {
        // 初始化随机cache
        await this.init_cache();
        // 每次往文件中写入质数个bytes,避免chunk 重复 
        while (file_size > this.cahce_buff.byteLength) {
            await fs.appendFileSync(file_path, this.cahce_buff);
            file_size = file_size - this.cahce_buff.byteLength;
        }
        await fs.appendFileSync(file_path, Buffer.from(this.string(file_size)));
    }
    async _md5(file_path) {
        let fsHash = crypto.createHash('md5');
        let fileInfo = fs.readFileSync(file_path);
        fsHash.update(fileInfo);
        let md5 = fsHash.digest('hex');
        return md5;
    }
    async create_file(command) {
        if (!command.json.file_size) {
            this.m_logger.error(`error command : ${JSON.stringify(command.json)}`);
            return { err: base_1.ErrorCode.unknownCommand };
        }
        let file_name = `${this.string(10)}.txt`;
        let file_size = command.json.file_size;
        let file_path = path.join(this.cache_path.file_upload, `${file_name}`);
        //创建文件夹
        if (!fs.existsSync(this.cache_path.file_upload)) {
            await fs.mkdirpSync(this.cache_path.file_upload);
        }
        //生成文件
        await this._createFile(file_path, file_size);
        let md5 = await this._md5(file_path);
        return {
            err: base_1.ErrorCode.succ, resp: {
                json: {
                    file_name,
                    file_path,
                    md5
                },
                bytes: Buffer.from("")
            }
        };
    }
    async get_cache_path(command) {
        return {
            err: base_1.ErrorCode.succ, resp: {
                json: {
                    platform: this.m_interface.getPlatform(),
                    cache_path: this.cache_path,
                },
                bytes: Buffer.from("")
            }
        };
    }
    async create_dir(command) {
        if (!command.json.file_size || !command.json.dir_number || !command.json.file_number || !command.json.deep) {
            this.m_logger.error(`error command : ${JSON.stringify(command.json)}`);
            return { err: base_1.ErrorCode.unknownCommand };
        }
        let dir_name = this.string(10);
        let dir_path = path.join(this.cache_path.file_upload, `${dir_name}`);
        //创建文件夹
        if (!fs.existsSync(this.cache_path.file_upload)) {
            await fs.mkdirpSync(this.cache_path.file_upload);
        }
        fs.mkdirpSync(dir_path);
        for (let i = 0; i < command.json.file_number; i++) {
            await this._createFile(dir_path, command.json.file_size);
        }
        return {
            err: base_1.ErrorCode.succ, resp: {
                json: {
                    dir_name,
                    dir_path,
                },
                bytes: Buffer.from("")
            }
        };
    }
    async md5(command) {
        if (!command.json.file_path) {
            this.m_logger.error(`error command : ${JSON.stringify(command.json)}`);
            return { err: base_1.ErrorCode.unknownCommand };
        }
        let md5 = await this._md5(command.json.file_path);
        return {
            err: base_1.ErrorCode.succ, resp: {
                json: {
                    md5,
                },
                bytes: Buffer.from("")
            }
        };
    }
    async get_IP_info(command) {
        var interfaces = require('os').networkInterfaces();
        this.m_logger.info(interfaces);
        var IPv4_list = [];
        var IPv6_list = [];
        for (var devName in interfaces) {
            var iface = interfaces[devName];
            for (var i = 0; i < iface.length; i++) {
                var alias = iface[i];
                if (alias.family == 'IPv4' && alias.address !== '127.0.0.1') { //&& !alias.internal
                    IPv4_list.push(alias.address);
                }
                if (alias.family == 'IPv6' && alias.address !== '127.0.0.1') { //&& !alias.internal
                    IPv6_list.push(alias.address);
                }
            }
        }
        return {
            err: base_1.ErrorCode.succ, resp: {
                json: {
                    ipInfo: { IPv4: IPv4_list, IPv6: IPv6_list }
                },
                bytes: Buffer.from("")
            }
        };
    }
    async upload_log(command) {
        this.m_logger.info(`command : ${JSON.stringify(command.json)}`);
        if (!command.json.log_name) {
            this.m_logger.error(`error command : ${JSON.stringify(command.json)}`);
            return { err: base_1.ErrorCode.unknownCommand };
        }
        let zip = await this.m_interface.zip(this.m_interface.getLogger().dir(), command.json.log_name);
        let upload = await this.m_interface.uploadFile(zip.dstPath, "logs");
        this.m_logger.info(`upload log to server ,result = ${JSON.stringify(upload)}`);
        return {
            err: base_1.ErrorCode.succ, resp: {
                json: {
                    upload,
                },
                bytes: Buffer.from("")
            }
        };
    }
}
exports.UtilTool = UtilTool;
