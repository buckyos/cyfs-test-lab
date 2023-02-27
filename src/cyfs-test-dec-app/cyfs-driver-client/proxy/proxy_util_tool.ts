import { ErrorCode, Logger, TaskClientInterface } from '../../base';
import { UtilTool } from "../cyfs_driver"
import { string_to_Uint8Array } from "../../common_base"
import * as cyfs from "../../cyfs"
import * as crypto from 'crypto';
const CHAR_SET: string = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz0123456789';
export class ProxyUtilTool implements UtilTool {
    public peer_name: string; //  
    private m_agentid: string;
    private logger: Logger;
    private m_interface: TaskClientInterface;
    public tags: string;
    private cache_kb?: Buffer;
    private cache_mb?: Buffer;
    private cache_100mb?: Buffer;
    private cache_10mb?: Buffer;
    private cahce_buff?: Buffer; //1000037 大素数
    constructor(_interface: TaskClientInterface, agentid: string, tags: string, peer_name: string) {
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

    async create_file(file_size: number): Promise<{ err: ErrorCode, log?: string, file_name?: string, file_path?: string, md5?: string }> {
        console.info(`proxy_util create_file`)
        let result = await this.m_interface.callApi('util_request', Buffer.from(''), {
            name: "create_file",
            peer_name: this.peer_name,
            file_size,
        }, this.m_agentid!, 10 * 1000);
        this.logger.info(`${this.tags} createFile = ${JSON.stringify(result)}`)
        return result.value;
    }
    async create_dir(file_number: number, file_size: number, dir_number: number, deep: string): Promise<{
        err: ErrorCode, log?: string, dir_name?: string, dir_path?: string, file_list?: Array<{
            file_name: string, md5: string,
        }> }> {
        console.info(`proxy_util create_dir`)
        let result = await this.m_interface.callApi('util_request', Buffer.from(''), {
            name: "create_dir",
            peer_name: this.peer_name,
            dir_number,
            file_number,
            deep,
            file_size,
        }, this.m_agentid!, 10 * 1000);
        this.logger.info(`${this.tags} createDir = ${JSON.stringify(result)}`)
        return result.value;
    }
    async md5_file(file_path: string): Promise<{ err: ErrorCode, md5?: string }> {
        console.info(`proxy_util md5_file ${file_path}`)
        let result = await this.m_interface.callApi('util_request', Buffer.from(''), {
            name: "md5",
            peer_name: this.peer_name,
            file_path,
        }, this.m_agentid!, 10 * 1000);
        this.logger.info(`${this.tags} md5File = ${JSON.stringify(result)}`)
        return result.value;
    }
    async get_cache_path(): Promise<{ err: ErrorCode,platform?:string, cache_path?: { file_upload: string, file_download: string } }> {
        console.info(`proxy_util get_cache_path`)
        let result = await this.m_interface.callApi('util_request', Buffer.from(''), {
            name: "get_cache_path",
            peer_name: this.peer_name,
        }, this.m_agentid!, 10 * 1000);
        this.logger.info(`${this.tags} getCachePath = ${JSON.stringify(result)}`)
        return result.value;
    }
    integer(max: number, min: number = 0) {
        let result = Math.round(Math.random() * (max - min)) + min;
        if (result > max) {
            result = max;
        }
        return result;
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
