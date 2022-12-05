import { ErrorCode, Logger, TaskClientInterface } from '../../base';
import { UtilTool } from "../cyfs_driver";
import * as fs from "fs-extra";
import * as crypto from 'crypto';
import path from 'path';

const CHAR_SET: string = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz0123456789';
export class LocalUtilTool implements UtilTool {
    private cache_kb?: Buffer;
    private cache_mb?: Buffer;
    private cahce_buff?: Buffer; //1000037 大素数
    private cache_path: { file_upload: string, file_download: string };
    private m_logger: Logger;
    constructor(logger: Logger, root: string) {
        this.m_logger = logger;
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
    async init_cache(){
        if (!this.cache_mb) {
            this.cache_mb = Buffer.from(this.string(1000000));
        }
        this.cache_kb = Buffer.from(this.string(37));
        this.cahce_buff = Buffer.concat([this.cache_kb, this.cache_mb]);
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
        while (file_size > this.cahce_buff!.byteLength) {
            await fs.appendFileSync(file_path, this.cahce_buff!)
            file_size = file_size - this.cahce_buff!.byteLength;
        }
        await fs.appendFileSync(file_path, Buffer.from(this.string(file_size)))
    }
    async _md5(file_path: string) {
        let fsHash = crypto.createHash('md5')
        let fileInfo = fs.readFileSync(file_path,)
        fsHash.update(fileInfo)
        let md5 = fsHash.digest('hex')
        return md5;
    }
    async create_file(file_size: number): Promise<{ err: ErrorCode, log?: string, file_name?: string, file_path?: string, md5?: string }> {
        let file_name = `${this.string(10)}.txt`
        let file_path = path.join(this.cache_path.file_upload, `${file_name}`)
        //创建文件夹
        if (!fs.existsSync(this.cache_path.file_upload)) {
            await fs.mkdirpSync(this.cache_path.file_upload);
        }
        //生成文件
        await this._createFile(file_path, file_size);
        let md5 = await this._md5(file_path);
        return {
            err: ErrorCode.succ,
            log: `create file success`,
            file_name,
            file_path,
            md5
        }
    }
    async create_dir(file_number: number, file_size: number, dir_number: number, deep: string): Promise<{ err: ErrorCode, log?: string, dir_name?: string, dir_path?: string }> {
        let dir_name = this.string(10);
        let dir_path = path.join(this.cache_path.file_upload, `${dir_name}`)
        //创建文件夹
        if (!fs.existsSync(this.cache_path.file_upload)) {
            await fs.mkdirpSync(this.cache_path.file_upload);
        }
        fs.mkdirpSync(dir_path);
        for (let i = 0; i < file_number; i++) {
            await this._createFile(dir_path, file_size!)
        }
        return {
            err: ErrorCode.succ,
            log: `create dir success`,
            dir_name,
            dir_path
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

}
