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
exports.ProxyUtilTool = void 0;
const common_1 = require("../../common");
const cyfs = __importStar(require("../../cyfs"));
const crypto = __importStar(require("crypto"));
const CHAR_SET = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz0123456789';
class ProxyUtilTool {
    constructor(_interface, agentid, tags, peer_name) {
        this.m_agentid = agentid;
        this.tags = tags;
        this.m_interface = _interface;
        this.logger = _interface.getLogger();
        this.peer_name = peer_name;
    }
    async init_cache() {
        if (!this.cache_mb) {
            this.cache_mb = Buffer.from(this.string(999000));
        }
        this.cache_kb = Buffer.from(this.string(1037));
        this.cahce_buff = Buffer.concat([this.cache_kb, this.cache_mb]);
    }
    async init_cache_10mb() {
        this.cache_10mb = Buffer.from("");
        let size = 9999991;
        let mb_length = this.cache_mb.length;
        while (size > mb_length) {
            this.cache_10mb = Buffer.concat([this.cache_10mb, this.cache_mb]);
            size = size - mb_length;
        }
        this.cache_10mb = Buffer.concat([this.cache_10mb, Buffer.from(this.string(size))]);
    }
    async init_cache_100mb() {
        this.cache_100mb = Buffer.from("");
        let size = 99999989;
        let mb_length = this.cache_mb.length;
        while (size > mb_length) {
            this.cache_100mb = Buffer.concat([this.cache_100mb, this.cache_mb]);
            size = size - mb_length;
        }
        this.cache_100mb = Buffer.concat([this.cache_100mb, Buffer.from(this.string(size))]);
    }
    async create_file(file_size) {
        console.info(`proxy_util create_file`);
        let result = await this.m_interface.callApi('util_request', Buffer.from(''), {
            name: "create_file",
            peer_name: this.peer_name,
            file_size,
        }, this.m_agentid, 10 * 1000);
        this.logger.info(`${this.tags} createFile = ${JSON.stringify(result)}`);
        return result.value;
    }
    async create_dir(file_number, file_size, dir_number, deep) {
        console.info(`proxy_util create_dir`);
        let result = await this.m_interface.callApi('util_request', Buffer.from(''), {
            name: "create_dir",
            peer_name: this.peer_name,
            dir_number,
            file_number,
            deep,
            file_size,
        }, this.m_agentid, 10 * 1000);
        this.logger.info(`${this.tags} createDir = ${JSON.stringify(result)}`);
        return result.value;
    }
    async md5_file(file_path) {
        console.info(`proxy_util md5_file ${file_path}`);
        let result = await this.m_interface.callApi('util_request', Buffer.from(''), {
            name: "md5",
            peer_name: this.peer_name,
            file_path,
        }, this.m_agentid, 10 * 1000);
        this.logger.info(`${this.tags} md5File = ${JSON.stringify(result)}`);
        return result.value;
    }
    async get_cache_path() {
        console.info(`proxy_util get_cache_path`);
        let result = await this.m_interface.callApi('util_request', Buffer.from(''), {
            name: "get_cache_path",
            peer_name: this.peer_name,
        }, this.m_agentid, 10 * 1000);
        this.logger.info(`${this.tags} getCachePath = ${JSON.stringify(result)}`);
        return result.value;
    }
    integer(max, min = 0) {
        let result = Math.round(Math.random() * (max - min)) + min;
        if (result > max) {
            result = max;
        }
        return result;
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
    async rand_cyfs_chunk_cache(chunk_size) {
        this.logger.info(`rand_cyfs_chunk_cache in memory data_size = ${chunk_size}`);
        await this.init_cache();
        let chunk_data = Buffer.from("");
        //let chunk_data =  string_to_Uint8Array(this.string(chunk_size));
        if (chunk_size > 100 * 1024 * 1024) {
            await this.init_cache_100mb();
            let length = this.cache_100mb.length;
            while (chunk_size > length) {
                console.info(`rand_cyfs_chunk_cache in memory add need chunk_size = ${chunk_size}`);
                chunk_data = Buffer.concat([chunk_data, this.cache_100mb]);
                chunk_size = chunk_size - length;
            }
        }
        if (chunk_size > 10 * 1024 * 1024) {
            await this.init_cache_10mb();
            let length = this.cache_10mb.length;
            while (chunk_size > length) {
                console.info(`rand_cyfs_chunk_cache in memory add need chunk_size = ${chunk_size}`);
                chunk_data = Buffer.concat([chunk_data, this.cache_10mb]);
                chunk_size = chunk_size - length;
            }
        }
        let length = this.cahce_buff.length;
        while (chunk_size > length) {
            chunk_data = Buffer.concat([chunk_data, this.cahce_buff]);
            chunk_size = chunk_size - length;
            console.info(`rand_cyfs_chunk_cache in memory add need chunk_size = ${chunk_size}`);
        }
        chunk_data = Buffer.concat([chunk_data, Buffer.from(this.string(chunk_size))]);
        console.info(`rand_cyfs_chunk_cache in memory success`);
        let chunk_calculate = cyfs.ChunkId.calculate(chunk_data);
        return { err: common_1.ErrorCode.succ, chunk_data, chunk_id: chunk_calculate };
    }
    async rand_cyfs_file_cache(owner, file_size, chunk_size) {
        this.logger.info(`rand_cyfs_file_cache in memory file_size = ${file_size}`);
        let chunk_list = [];
        let file_data = Buffer.from("");
        while (file_size > chunk_size) {
            let chunk_info = await this.rand_cyfs_chunk_cache(chunk_size);
            chunk_list.push(chunk_info.chunk_id);
            file_data = Buffer.concat([file_data, chunk_info.chunk_data]);
            file_size = file_size - chunk_size;
        }
        if (file_size > 0) {
            let chunk_info = await this.rand_cyfs_chunk_cache(file_size);
            chunk_list.push(chunk_info.chunk_id);
            file_data = Buffer.concat([file_data, chunk_info.chunk_data]);
        }
        let hash_value = cyfs.HashValue.hash_data(file_data);
        let chunkList = new cyfs.ChunkList(chunk_list);
        let file = cyfs.File.create(owner, cyfs.JSBI.BigInt(file_size), hash_value, chunkList);
        let fsHash = crypto.createHash('md5');
        fsHash.update(file_data);
        let md5 = fsHash.digest('hex');
        return { err: common_1.ErrorCode.succ, file, file_data, md5 };
    }
    async md5_buffer(file_data) {
        let fsHash = crypto.createHash('md5');
        fsHash.update(file_data);
        let md5 = fsHash.digest('hex');
        return md5;
    }
}
exports.ProxyUtilTool = ProxyUtilTool;
