import { ErrorCode, Logger, TaskClientInterface } from '../../base';
import { UtilTool } from "../cyfs_driver";
import { string_to_Uint8Array } from "../../common_base"
import * as fs from "fs-extra";
import * as crypto from 'crypto';
import path from 'path';
import * as cyfs from "../../cyfs"

const CHAR_SET: string = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz0123456789';
export class LocalUtilTool implements UtilTool {
    private cache_kb?: Buffer;
    private cache_mb?: Buffer;
    private cache_100mb?: Buffer;
    private cache_10mb?: Buffer;
    private cahce_buff?: Buffer; //1000037 大素数
    private cache_path: { file_upload: string, file_download: string };
    private logger: Logger;
    constructor(logger: Logger, root: string) {
        this.logger = logger;
        this.cache_path = {
            file_upload: path.join(root, "file_upload"),
            file_download: path.join(root, "file_download"),
        }
        this.init_dir()
    }
    init_dir() {
        fs.mkdirpSync(this.cache_path.file_upload);
        fs.mkdirpSync(this.cache_path.file_download);
    }
    async init() {
        this.init_dir()
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
        let mb_length = this.cache_mb!.length;
        while (size > mb_length) {
            this.cache_10mb = Buffer.concat([this.cache_10mb, this.cache_mb!]);
            size = size - mb_length;
        }
        this.cache_10mb = Buffer.concat([this.cache_10mb, Buffer.from(this.string(size))]);
    }

    async init_cache_100mb() {
        this.cache_100mb = Buffer.from("");
        let size = 99999989;
        let mb_length = this.cache_mb!.length;
        while (size > mb_length) {
            this.cache_100mb = Buffer.concat([this.cache_100mb, this.cache_mb!]);
            size = size - mb_length;
        }
        this.cache_100mb = Buffer.concat([this.cache_100mb, Buffer.from(this.string(size))]);
    }
    string(length: number = 32) {
        let maxPos = CHAR_SET.length;
        let result = '';
        for (let i = 0; i < length; i++) {
            result += CHAR_SET.charAt(this.integer(maxPos));
        }
        while (Buffer.byteLength(result) < length) {
            result += CHAR_SET.charAt(this.integer(maxPos));
        }
        return result;
    };

    integer(max: number, min: number = 0) {
        let result = Math.round(Math.random() * (max - min)) + min;
        if (result > max) {
            result = max;
        }
        return result;
    }
    async _createFile(file_path: string, file_size: number) {
        // 初始化随机cache
        await this.init_cache();
        // 每次往文件中写入质数个bytes,避免chunk 重复 
        try {
            while (file_size > this.cahce_buff!.byteLength) {
                await fs.appendFileSync(file_path, this.cahce_buff!)
                file_size = file_size - this.cahce_buff!.byteLength;
            }
            await fs.appendFileSync(file_path, Buffer.from(this.string(file_size)))
        } catch (error) {
            this.logger!.error(`create random file err = ${JSON.stringify(error)}`);
            return { err: error }
        }


    }
    async _md5(file_path: string) {
        try {
            let fsHash = crypto.createHash('md5')
            let fileInfo = fs.readFileSync(file_path)
            fsHash.update(fileInfo)
            let md5 = fsHash.digest('hex')
            this.logger.info(`${file_path} md5 =${md5}`)
            return md5;
        } catch (error) {
            this.logger!.error(`md5 file err = ${JSON.stringify(error)}`);
            return JSON.stringify(error)
        }

    }
    async create_file(file_size: number, dir_path?: string): Promise<{ err: ErrorCode, log?: string, file_name?: string, file_path?: string, md5?: string }> {
        let file_name = `${this.string(10)}.txt`
        if (!dir_path) {
            dir_path = this.cache_path.file_upload
        }
        let file_path = path.join(dir_path, `${file_name}`)
        //创建文件夹
        if (!fs.existsSync(dir_path)) {
            await fs.mkdirpSync(this.cache_path.file_upload);
        }
        //生成文件
        await this._createFile(file_path, file_size);
        let md5 = await this._md5(file_path);
        this.logger.info(`create file ${file_path} success`);
        return {
            err: ErrorCode.succ,
            log: `create file success`,
            file_name,
            file_path,
            md5
        }
    }
    async create_dir(file_number: number, file_size: number, dir_number: number, deep: string): Promise<{
        err: ErrorCode, log?: string, dir_name?: string, dir_path?: string, file_list?: Array<{
            file_name: string, md5: string,
        }>
    }> {
        let dir_name = this.string(10);
        let dir_path = path.join(this.cache_path.file_upload, `${dir_name}`)
        //创建文件夹
        if (!fs.existsSync(this.cache_path.file_upload)) {
            await fs.mkdirpSync(this.cache_path.file_upload);
        }
        fs.mkdirpSync(dir_path);
        let file_list: Array<{
            file_name: string,
            md5: string,
        }> = [];
        for (let i = 0; i < file_number; i++) {
            let file_info = await this.create_file(file_size!, dir_path)
            file_list.push({
                file_name: file_info.file_name!,
                md5: file_info.md5!
            })
        }
        return {
            err: ErrorCode.succ,
            log: `create dir success`,
            dir_name,
            dir_path,
            file_list
        }
    }
    async md5_file(file_path: string): Promise<{ err: ErrorCode, md5?: string }> {
        let md5 = await this._md5(file_path);
        return {
            err: ErrorCode.succ,
            md5,
        }
    }
    async get_cache_path(): Promise<{ err: ErrorCode, cache_path?: { file_upload: string, file_download: string } }> {
        return {
            err: ErrorCode.succ,
            cache_path: this.cache_path,
        }
    }
    async rand_cyfs_chunk_cache(chunk_size: number): Promise<{ err: ErrorCode, chunk_id: cyfs.ChunkId, chunk_data: Uint8Array }> {
        this.logger.info(`rand_cyfs_chunk_cache in memory data_size = ${chunk_size}`)

        await this.init_cache();
        let chunk_data: Buffer = Buffer.from("");
        //let chunk_data =  string_to_Uint8Array(this.string(chunk_size));
        if (chunk_size > 100 * 1024 * 1024) {
            await this.init_cache_100mb();
            let length = this.cache_100mb!.length;
            while (chunk_size > length) {
                console.info(`rand_cyfs_chunk_cache in memory add need chunk_size = ${chunk_size}`)
                chunk_data = Buffer.concat([chunk_data, this.cache_100mb!]);
                chunk_size = chunk_size - length;
            }
        }
        if (chunk_size > 10 * 1024 * 1024) {
            await this.init_cache_10mb();
            let length = this.cache_10mb!.length;
            while (chunk_size > length) {
                console.info(`rand_cyfs_chunk_cache in memory add need chunk_size = ${chunk_size}`)
                chunk_data = Buffer.concat([chunk_data, this.cache_10mb!]);
                chunk_size = chunk_size - length;
            }
        }
        let length = this.cahce_buff!.length;
        while (chunk_size > length) {
            chunk_data = Buffer.concat([chunk_data, this.cahce_buff!]);
            chunk_size = chunk_size - length;
            console.info(`rand_cyfs_chunk_cache in memory add need chunk_size = ${chunk_size}`)
        }
        chunk_data = Buffer.concat([chunk_data, Buffer.from(this.string(chunk_size))]);
        console.info(`rand_cyfs_chunk_cache in memory success`)
        let chunk_calculate = cyfs.ChunkId.calculate(chunk_data);
        return { err: ErrorCode.succ, chunk_data, chunk_id: chunk_calculate }
    }

    async rand_cyfs_file_cache(owner: cyfs.ObjectId, file_size: number, chunk_size: number): Promise<{ err: ErrorCode, file: cyfs.File, file_data: Buffer, md5: string }> {
        this.logger.info(`rand_cyfs_file_cache in memory file_size = ${file_size}`)
        let chunk_list: Array<cyfs.ChunkId> = []
        let file_data: Buffer = Buffer.from("");
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
        let file = cyfs.File.create(owner, cyfs.JSBI.BigInt(file_size), hash_value, chunkList)
        let fsHash = crypto.createHash('md5')
        fsHash.update(file_data)
        let md5 = fsHash.digest('hex')
        return { err: ErrorCode.succ, file, file_data, md5 }
    }
    async md5_buffer(file_data: Buffer): Promise<string> {
        let fsHash = crypto.createHash('md5')
        fsHash.update(file_data)
        let md5 = fsHash.digest('hex')
        return md5
    }
}
