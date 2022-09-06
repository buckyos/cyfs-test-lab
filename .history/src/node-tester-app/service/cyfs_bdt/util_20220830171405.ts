import {ErrorCode, Namespace, BufferWriter, ServiceClientInterface, Logger, sleep} from '../../base';
import{RandomGenerator} from "./generator"
import { BdtLpc, BdtLpcCommand ,BdtLpcResp} from './lpc';
import { BdtPeer } from './peer';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as crypto from 'crypto';


export class UtilTool {
    private m_interface:ServiceClientInterface
    private m_logger: Logger;
    constructor(_interface:ServiceClientInterface,logger:Logger){
        this.m_logger = logger;
        this.m_interface = _interface;
    }

    async utilRequest(command:BdtLpcCommand):Promise<BdtLpcResp>{
        if(!command.json.name){
            return {err:ErrorCode.notFound}
        }
        switch(command.json.name){
            case "createFile" : {
                return await this.createFile(command);
            };
            case "createDir" : {
                return  await this.createDir(command);
            };
            case "md5" : {
                return await this.md5(command);
            }; 
            case "getIPInfo" : {
                return  await this.getIPInfo(command);
            };
            case "uploadLog":{
                return await this.uploadLog(command);
            };
            case "uploadCacheFile":{
                return await this.uploadCacheFile(command);
            };
            case "getCachePath":{
                return await this.getCachePath(command);
            }
        }
        this.m_logger.info(`#### not found utilRequest req_path `)
        return {err:ErrorCode.notFound}
    }
    async _createFile(filePath:string,fileSize:number){
        let same =  new Buffer (RandomGenerator.string(999983)) 
        if(fileSize>90*1024*1024){
            same = new Buffer (RandomGenerator.string(10*999983)) 
        }
        let randBuffer = new Buffer(''); 
        while(fileSize>(same.length+200)){
            randBuffer = Buffer.concat([randBuffer,new Buffer ( RandomGenerator.string(100)),same,new Buffer ( RandomGenerator.string(100))]);
            await fs.appendFileSync(filePath,randBuffer)
            fileSize = fileSize - randBuffer.byteLength;
            this.m_logger.info(`add buffer ${randBuffer.length} `)
            await sleep(50);
        }
        await fs.appendFileSync(filePath,new Buffer (RandomGenerator.string(fileSize)))
    }
    async _md5(filePath:string){
        let fsHash = crypto.createHash('md5')
        let fileInfo = fs.readFileSync(filePath,)
        fsHash.update(fileInfo)
        let md5 = fsHash.digest('hex')
        return md5;
    }
    async createFile(command:BdtLpcCommand):Promise<BdtLpcResp>{
        if(!command.json.fileSize || !command.json.peerName){
            this.m_logger.error(`error command : ${JSON.stringify(command.json)}`)
            return {err:ErrorCode.unknownCommand}
        }
        let peer = this._peerCachePath(command.json.peerName)
        let fileName = `${RandomGenerator.string(10)}.txt`
        let fileSize : number = command.json.fileSize!;
        let filePath = path.join(peer.cache_path.file_upload,`${fileName}`)
        //创建文件夹
        if(!fs.existsSync(peer.cache_path.file_upload)){
            await fs.mkdirpSync(peer.cache_path.file_upload);
        }
        //生成文件
        
        await this._createFile(filePath,fileSize);
        let md5 = this._md5(filePath);
        return {err:ErrorCode.succ,resp:{
            json : {
                fileName,
                filePath,
                md5
            },
            bytes : Buffer.from("")
        }}
    }
    _peerCachePath(peerName:string){
        return{cache_path :{
            file_upload:path.join(this.m_logger.dir(),`../${peerName}_cache`,"file_upload"),
            file_download:path.join(this.m_logger.dir(),`../${peerName}_cache`,"file_download"),
            NamedObject:path.join(this.m_logger.dir(),`../${peerName}_cache`,"NamedObject")
        }}
    }
    async getCachePath(command:BdtLpcCommand):Promise<BdtLpcResp>{
        if( !command.json.peerName){
            this.m_logger.error(`error command : ${JSON.stringify(command.json)}`)
            return {err:ErrorCode.unknownCommand}
        }
        let peer = this._peerCachePath(command.json.peerName)
        return {err:ErrorCode.succ,resp:{
            json : {
                cache_path : peer.cache_path,
            },
            bytes : Buffer.from("")
        }}
    }
    async createDir(command:BdtLpcCommand):Promise<BdtLpcResp>{
        if( !command.json.peerName|| !command.json.fileSize || !command.json.dirNumber || !command.json.fileNumber || !command.json.deep){
            this.m_logger.error(`error command : ${JSON.stringify(command.json)}`)
            return {err:ErrorCode.unknownCommand}
        }
        let peer = this._peerCachePath(command.json.peerName)
        let dirName = RandomGenerator.string(10);
        let dirPath = path.join(peer.cache_path.file_upload,`${dirName}`)
        //创建文件夹
        if(!fs.existsSync(peer.cache_path.file_upload)){
            await fs.mkdirpSync(peer.cache_path.file_upload);
        }
        await RandomGenerator.createRandomDir(dirPath,command.json.dirNumber,command.json.fileNumber,command.json.fileSize,command.json.deep);
        return {err:ErrorCode.succ,resp:{
            json : {
                dirName,
                dirPath,
            },
            bytes : Buffer.from("")
        }}
    }
    async md5(command:BdtLpcCommand):Promise<BdtLpcResp>{
        if(!command.json.filePath){
            this.m_logger.error(`error command : ${JSON.stringify(command.json)}`)
            return {err:ErrorCode.unknownCommand}
        }
        let md5 = await this._md5(command.json.filePath);
        return {err:ErrorCode.succ,resp:{
            json : {
                md5,
            },
            bytes : Buffer.from("")
        }}
    }
    async getIPInfo(command:BdtLpcCommand):Promise<BdtLpcResp>{
        var interfaces = require('os').networkInterfaces();
        this.m_logger.info(interfaces)
        var IPv4List:Array<string> = []
        var IPv6List:Array<string> = []
        for(var devName in interfaces){
            var iface = interfaces[devName];
            for(var i=0;i<iface.length;i++){
                var alias = iface[i];
                if( alias.family == 'IPv4' && alias.address !== '127.0.0.1' ){ //&& !alias.internal
                    IPv4List.push(alias.address);
                }
                if( alias.family == 'IPv6' && alias.address !== '127.0.0.1' ){ //&& !alias.internal
                    IPv6List.push(alias.address);
                }
            }
        }
        return {err:ErrorCode.succ,resp:{
            json : {
                ipInfo:{IPv4:IPv4List,IPv6:IPv6List}
            },
            bytes : Buffer.from("")
        }}
    }
    async uploadLog(command:BdtLpcCommand):Promise<BdtLpcResp>{
        this.m_logger.info(`command : ${JSON.stringify(command.json)}`)
        if(!command.json.logName){
            this.m_logger.error(`error command : ${JSON.stringify(command.json)}`)
            return {err:ErrorCode.unknownCommand}
        }
        
        let zip = await this.m_interface.zip(this.m_interface.getLogger().dir(),command.json.logName)
        let upload = await this.m_interface.uploadFile(zip.dstPath!,"logs");
        this.m_logger.info(`upload log to server ,result = ${JSON.stringify(upload)}`)
        return {err:ErrorCode.succ,resp:{
            json : {
                upload,
            },
            bytes : Buffer.from("")
        }}
    }
    async uploadCacheFile(command:BdtLpcCommand,peer?: BdtPeer):Promise<BdtLpcResp>{
        if(!peer ||!command.json.cacheType || !command.json.logName){
            this.m_logger.error(`error command : ${JSON.stringify(command.json)}`)
            return {err:ErrorCode.unknownCommand}
        }
        let dir = ""
        if(command.json.cacheType=="file_download"){
            dir = peer.cache_path.file_download
        }else if(command.json.cacheType=="file_upload"){
            dir = peer.cache_path.file_upload
        }else if(command.json.cacheType=="NamedObject"){
            dir = peer.cache_path.NamedObject
        }else{
            return {err:ErrorCode.unknownCommand}
        }
        let zip = await this.m_interface.zip(this.m_interface.getLogger().dir(),command.json.logName)
        let upload = await this.m_interface.uploadFile(zip.dstPath!,"logs");
        return {err:ErrorCode.succ,resp:{
            json : {
                upload,
            },
            bytes : Buffer.from("")
        }}
    }
}
