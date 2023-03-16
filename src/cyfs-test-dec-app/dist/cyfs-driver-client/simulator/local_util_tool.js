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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalUtilTool = void 0;
const common_1 = require("../../common");
const fs = __importStar(require("fs-extra"));
const crypto = __importStar(require("crypto"));
const path_1 = __importDefault(require("path"));
const cyfs = __importStar(require("../../cyfs"));
const CHAR_SET = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz0123456789';
class LocalUtilTool {
    constructor(logger, root) {
        this.logger = logger;
        this.cache_path = {
            file_upload: path_1.default.join(root, "file_upload"),
            file_download: path_1.default.join(root, "file_download"),
        };
        this.init_dir();
    }
    init_dir() {
        fs.mkdirpSync(this.cache_path.file_upload);
        fs.mkdirpSync(this.cache_path.file_download);
    }
    async init() {
        this.init_dir();
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
    async _createFile(file_path, file_size) {
        // 初始化随机cache
        await this.init_cache();
        // 每次往文件中写入质数个bytes,避免chunk 重复 
        try {
            while (file_size > this.cahce_buff.byteLength) {
                await fs.appendFileSync(file_path, this.cahce_buff);
                file_size = file_size - this.cahce_buff.byteLength;
            }
            await fs.appendFileSync(file_path, Buffer.from(this.string(file_size)));
        }
        catch (error) {
            this.logger.error(`create random file err = ${JSON.stringify(error)}`);
            return { err: error };
        }
    }
    async _md5(file_path) {
        try {
            let fsHash = crypto.createHash('md5');
            let fileInfo = fs.readFileSync(file_path);
            fsHash.update(fileInfo);
            let md5 = fsHash.digest('hex');
            this.logger.info(`${file_path} md5 =${md5}`);
            return md5;
        }
        catch (error) {
            this.logger.error(`md5 file err = ${JSON.stringify(error)}`);
            return JSON.stringify(error);
        }
    }
    async create_file(file_size, dir_path) {
        let file_name = `${this.string(10)}.txt`;
        if (!dir_path) {
            dir_path = this.cache_path.file_upload;
        }
        let file_path = path_1.default.join(dir_path, `${file_name}`);
        //创建文件夹
        if (!fs.existsSync(dir_path)) {
            await fs.mkdirpSync(this.cache_path.file_upload);
        }
        //生成文件
        await this._createFile(file_path, file_size);
        let md5 = await this._md5(file_path);
        this.logger.info(`create file ${file_path} success`);
        return {
            err: common_1.ErrorCode.succ,
            log: `create file success`,
            file_name,
            file_path,
            md5
        };
    }
    async create_dir(file_number, file_size, dir_number, deep) {
        let dir_name = this.string(10);
        let dir_path = path_1.default.join(this.cache_path.file_upload, `${dir_name}`);
        //创建文件夹
        if (!fs.existsSync(this.cache_path.file_upload)) {
            await fs.mkdirpSync(this.cache_path.file_upload);
        }
        fs.mkdirpSync(dir_path);
        let file_list = [];
        for (let i = 0; i < file_number; i++) {
            let file_info = await this.create_file(file_size, dir_path);
            file_list.push({
                file_name: file_info.file_name,
                md5: file_info.md5
            });
        }
        return {
            err: common_1.ErrorCode.succ,
            log: `create dir success`,
            dir_name,
            dir_path,
            file_list
        };
    }
    async md5_file(file_path) {
        let md5 = await this._md5(file_path);
        return {
            err: common_1.ErrorCode.succ,
            md5,
        };
    }
    async get_cache_path() {
        return {
            err: common_1.ErrorCode.succ,
            cache_path: this.cache_path,
        };
    }
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
exports.LocalUtilTool = LocalUtilTool;
