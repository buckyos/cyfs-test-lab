import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, sleep, RandomGenerator} from '../../base';
import {Agent,Peer,BDTERROR} from './type'
import {string_to_Uint8Array} from "../../common_base"
import * as fs from "fs-extra";
import * as crypto from 'crypto';
import {UtilTool} from "../cyfs_driver"
import * as cyfs from "../../cyfs"
const CHAR_SET: string = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz0123456789';
export class UtilClient implements UtilTool {
    public client_name: string; //  
    private m_agentid: string;
    private logger : Logger; 
    private m_interface: TaskClientInterface;
    public tags:string;
    public cachePath? : {file_upload:string,file_download:string,NamedObject:string,logPath?:string}
    constructor(_interface: TaskClientInterface,agentid:string,tags:string,client_name:string) {
        this.m_agentid = agentid;
        this.tags = tags;
        this.m_interface = _interface;
        this.logger = _interface.getLogger();
        this.client_name = client_name;
    }
    async create_file(fileSize:number):Promise<{err:ErrorCode,log?:string,fileName?:string,filePath?:string,md5?:string}>{
        let result = await this.m_interface.callApi('utilRequest', Buffer.from(''), {
            name : "createFile",
            client_name: this.client_name,
            fileSize,
        }, this.m_agentid!, 10*1000);
        this.logger.info(`${this.tags} createFile = ${JSON.stringify(result)}`)
        if(result.err ){  
            return {err:ErrorCode.exception,log:`${this.tags} createFile failed`}
        }
        return {err:ErrorCode.succ,log:`${this.tags} createFile success`,fileName:result.value.fileName,filePath:result.value.filePath,md5:result.value.md5}
    }
    async create_dir(file_number:number,file_size:number,dir_number?:number,deep?:string):Promise<{err:ErrorCode,log?:string,dirName?:string,dirPath?:string}>{
        let result = await this.m_interface.callApi('utilRequest', Buffer.from(''), {
            name : "createDir",
            client_name: this.client_name,
            dir_number,
            file_number,
            deep,
            file_size,
        }, this.m_agentid!, 10*1000);
        this.logger.info(`${this.tags} createDir = ${JSON.stringify(result)}`)
        if(result.err ){  
            return {err:ErrorCode.exception,log:`${this.tags} createDir failed`}
        }
        return {err:ErrorCode.succ,log:`${this.tags} createDir success`,dirName:result.value.dirName,dirPath:result.value.dirPath,}
    }
    async create_path(dirName:string):Promise<{err:ErrorCode,log?:string,dirName?:string,dirPath?:string}>{
        let result = await this.m_interface.callApi('utilRequest', Buffer.from(''), {
            name : "createPath",
            client_name: this.client_name,
            dirName,
        }, this.m_agentid!, 10*1000);
        this.logger.info(`${this.tags} createPath = ${JSON.stringify(result)}`)
        if(result.err ){  
            return {err:ErrorCode.exception,log:`${this.tags} createDir failed`}
        }
        return {err:ErrorCode.succ,log:`${this.tags} createDir success`,dirName:result.value.dirName,dirPath:result.value.dirPath,}
    }
    async md5_file(filePath:string):Promise<{err:ErrorCode,md5?:string}>{
        let result = await this.m_interface.callApi('utilRequest', Buffer.from(''), {
            name : "md5",
            client_name: this.client_name,
            filePath,
        }, this.m_agentid!, 10*1000);
        this.logger.info(`${this.tags} md5File = ${JSON.stringify(result)}`)
        if(result.err ){  
            return {err:ErrorCode.exception}
        }
        return {err:ErrorCode.succ,md5:result.value.md5}
    }
    async get_cache_path():Promise<{err:ErrorCode,cache_path? : {file_upload:string,file_download:string,NamedObject:string,logPath?:string}}>{
        let result = await this.m_interface.callApi('utilRequest', Buffer.from(''), {
            name : "getCachePath",
            client_name: this.client_name,
        }, this.m_agentid!, 10*1000);
        this.logger.info(`${this.tags} getCachePath = ${JSON.stringify(result)}`)
        if(result.err ){  
            return {err:ErrorCode.exception}
        }
        this.cachePath = result.value.cache_path;
        return {err:ErrorCode.succ,cache_path:result.value.cache_path}
    }
    
    async removeNdcData():Promise<{err:ErrorCode,remove_list?:string}>{
        let result = await this.m_interface.callApi('utilRequest', Buffer.from(''), {
            name : "removeNdcData",
            client_name: this.client_name,
        }, this.m_agentid!, 10*1000);
        this.logger.info(`${this.tags} removeNdcData = ${JSON.stringify(result)}`)
        if(result.err ){  
            return {err:ErrorCode.exception}
        }
        return {err:ErrorCode.succ,remove_list:result.value.remove_list}
    }
    async ping():Promise<{err:ErrorCode}>{
        let result = await this.m_interface.callApi('utilRequest', Buffer.from(''), {
            name : "ping",
            client_name: this.client_name,
        }, this.m_agentid!, 10*1000);
        this.logger.info(`${this.tags} send ping ,pong = ${JSON.stringify(result)}`)
        if(result.err ){  
            return {err:ErrorCode.exception}
        }
        return {err:ErrorCode.succ}
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
    async rand_cyfs_chunk_cache(chunk_size:number):Promise<{err:ErrorCode,chunk_id:cyfs.ChunkId,chunk_data:Uint8Array}>{
        this.logger.info(`rand_cyfs_chunk_cache in memory data_size = ${chunk_size}`)
        let chunk_data =  string_to_Uint8Array(this.string(chunk_size));
        this.logger.info(chunk_data);
        let chunk_id =  cyfs.ChunkId.calculate(chunk_data);
        return {err:ErrorCode.succ,chunk_data,chunk_id}
    }

    async rand_cyfs_file_cache(owner: cyfs.ObjectId,file_size:number,chunk_size:number):Promise<{err:ErrorCode,file:cyfs.File,file_data:Buffer,md5:string}>{
        this.logger.info(`rand_cyfs_file_cache in memory file_size = ${file_size}`)
        let chunk_list : Array<cyfs.ChunkId> = []
        let file_data : Buffer = Buffer.from("");
        while (file_size > chunk_size) {
            let chunk_info  = await this.rand_cyfs_chunk_cache(chunk_size);
            chunk_list.push(chunk_info.chunk_id);
            file_data = Buffer.concat([file_data,chunk_info.chunk_data]);
            file_size = file_size - chunk_size;
        }
        if(file_size>0){
            let chunk_info  = await this.rand_cyfs_chunk_cache(file_size);
            chunk_list.push(chunk_info.chunk_id);
            file_data = Buffer.concat([file_data,chunk_info.chunk_data]);
        }
        let hash_value =  cyfs.HashValue.hash_data(file_data);
        let chunkList = new cyfs.ChunkList(chunk_list);
        let file = cyfs.File.create(owner,cyfs.JSBI.BigInt(file_size),hash_value,chunkList)
        let fsHash = crypto.createHash('md5')
        fsHash.update(file_data)
        let md5 = fsHash.digest('hex')
        return {err:ErrorCode.succ,file,file_data,md5}
    }
    async md5_buffer(file_data: Buffer): Promise<string> {
        let fsHash = crypto.createHash('md5')
        fsHash.update(file_data)
        let md5 = fsHash.digest('hex')
        return md5
    } 
}
