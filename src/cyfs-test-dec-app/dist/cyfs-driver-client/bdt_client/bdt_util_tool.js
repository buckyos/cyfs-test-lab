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
exports.UtilClient = void 0;
const common_1 = require("../../common");
const dec_app_base_1 = require("../../dec-app-base");
const crypto = __importStar(require("crypto"));
const cyfs = __importStar(require("../../cyfs"));
const CHAR_SET = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz0123456789';
class UtilClient {
    constructor(_interface, agentid, tags, client_name) {
        this.m_agentid = agentid;
        this.tags = tags;
        this.m_interface = _interface;
        this.logger = _interface.getLogger();
        this.client_name = client_name;
    }
    async create_file(fileSize) {
        let result = await this.m_interface.callApi('utilRequest', Buffer.from(''), {
            name: "createFile",
            client_name: this.client_name,
            fileSize,
        }, this.m_agentid, 10 * 1000);
        this.logger.info(`${this.tags} createFile = ${JSON.stringify(result)}`);
        if (result.err) {
            return { err: common_1.ErrorCode.exception, log: `${this.tags} createFile failed` };
        }
        return { err: common_1.ErrorCode.succ, log: `${this.tags} createFile success`, fileName: result.value.fileName, filePath: result.value.filePath, md5: result.value.md5 };
    }
    async create_dir(file_number, file_size, dir_number, deep) {
        let result = await this.m_interface.callApi('utilRequest', Buffer.from(''), {
            name: "createDir",
            client_name: this.client_name,
            dir_number,
            file_number,
            deep,
            file_size,
        }, this.m_agentid, 10 * 1000);
        this.logger.info(`${this.tags} createDir = ${JSON.stringify(result)}`);
        if (result.err) {
            return { err: common_1.ErrorCode.exception, log: `${this.tags} createDir failed` };
        }
        return { err: common_1.ErrorCode.succ, log: `${this.tags} createDir success`, dirName: result.value.dirName, dirPath: result.value.dirPath, };
    }
    async create_path(dirName) {
        let result = await this.m_interface.callApi('utilRequest', Buffer.from(''), {
            name: "createPath",
            client_name: this.client_name,
            dirName,
        }, this.m_agentid, 10 * 1000);
        this.logger.info(`${this.tags} createPath = ${JSON.stringify(result)}`);
        if (result.err) {
            return { err: common_1.ErrorCode.exception, log: `${this.tags} createDir failed` };
        }
        return { err: common_1.ErrorCode.succ, log: `${this.tags} createDir success`, dirName: result.value.dirName, dirPath: result.value.dirPath, };
    }
    async md5_file(filePath) {
        let result = await this.m_interface.callApi('utilRequest', Buffer.from(''), {
            name: "md5",
            client_name: this.client_name,
            filePath,
        }, this.m_agentid, 10 * 1000);
        this.logger.info(`${this.tags} md5File = ${JSON.stringify(result)}`);
        if (result.err) {
            return { err: common_1.ErrorCode.exception };
        }
        return { err: common_1.ErrorCode.succ, md5: result.value.md5 };
    }
    async get_cache_path() {
        let result = await this.m_interface.callApi('utilRequest', Buffer.from(''), {
            name: "getCachePath",
            client_name: this.client_name,
        }, this.m_agentid, 10 * 1000);
        this.logger.info(`${this.tags} getCachePath = ${JSON.stringify(result)}`);
        if (result.err) {
            return { err: common_1.ErrorCode.exception };
        }
        this.cachePath = result.value.cache_path;
        return { err: common_1.ErrorCode.succ, cache_path: result.value.cache_path };
    }
    async removeNdcData() {
        let result = await this.m_interface.callApi('utilRequest', Buffer.from(''), {
            name: "removeNdcData",
            client_name: this.client_name,
        }, this.m_agentid, 10 * 1000);
        this.logger.info(`${this.tags} removeNdcData = ${JSON.stringify(result)}`);
        if (result.err) {
            return { err: common_1.ErrorCode.exception };
        }
        return { err: common_1.ErrorCode.succ, remove_list: result.value.remove_list };
    }
    async ping() {
        let result = await this.m_interface.callApi('utilRequest', Buffer.from(''), {
            name: "ping",
            client_name: this.client_name,
        }, this.m_agentid, 10 * 1000);
        this.logger.info(`${this.tags} send ping ,pong = ${JSON.stringify(result)}`);
        if (result.err) {
            return { err: common_1.ErrorCode.exception };
        }
        return { err: common_1.ErrorCode.succ };
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
        let chunk_data = dec_app_base_1.string_to_Uint8Array(this.string(chunk_size));
        this.logger.info(chunk_data);
        let chunk_id = cyfs.ChunkId.calculate(chunk_data);
        return { err: common_1.ErrorCode.succ, chunk_data, chunk_id };
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
exports.UtilClient = UtilClient;
