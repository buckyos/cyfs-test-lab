import {ErrorCode, Namespace, BufferWriter, ServiceClientInterface, Logger, sleep} from '../../base';
import{RandomGenerator} from "./generator"
import { BdtLpc, BdtLpcCommand ,BdtLpcResp} from './lpc';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as crypto from 'crypto';




export class UtilTool {
    private m_interface:ServiceClientInterface
    private m_logger: Logger;
    private cacheSomeBuffer?: Buffer;
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
            case "createPath" : {
                return  await this.createPath(command);
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
            };
            case "removeNdcData":{
                return await this.removeNdcData(command);
            }
            case "loadAgentCache":{
                return await this.loadAgentCache(command);
            }
            case "removeAgentCache":{
                return await this.removeAgentCache(command);
            }
            case "check_version":{
                return await this.removeAgentCache(command);
            }
        }
        this.m_logger.info(`#### not found utilRequest req_path `)
        return {err:ErrorCode.notFound}
    }
    async removeNdcData(command:BdtLpcCommand):Promise<BdtLpcResp>{
        let platform = this.m_interface.getPlatform();
        let cyfs_data = "/cyfs/data"
        if(platform == 'win32'){
            cyfs_data = "c:\\cyfs\\data"
        }else if(platform == 'win32'){
            cyfs_data = "/cyfs/data"
        }
        let remove_list = [];
        let dir_list = fs.readdirSync(cyfs_data);
        for(let cache_path of dir_list){
            if(cache_path.includes("5a")){
                let r_path = path.join(cyfs_data,cache_path)
                fs.removeSync(r_path);
                remove_list.push(r_path)
            }
        }
        return {err:ErrorCode.succ,resp:{
            json : {
                remove_list
            },
            bytes : Buffer.from("")
        }}
    }
    async _createFile(filePath:string,fileSize:number){
        if(!this.cacheSomeBuffer){
            this.cacheSomeBuffer = Buffer.from(RandomGenerator.string(1000*1000)) ;
        }
        
        let same = this.cacheSomeBuffer;
        let randBuffer = new Buffer(''); 
        while(fileSize>(same.length+200)){
            //randBuffer = Buffer.concat([randBuffer,new Buffer ( RandomGenerator.string(100)),same,new Buffer ( RandomGenerator.string(100))]);
            await fs.appendFileSync(filePath,this.cacheSomeBuffer)
            fileSize = fileSize - this.cacheSomeBuffer.byteLength;
            randBuffer = Buffer.from(RandomGenerator.string(100))
            fileSize = fileSize - randBuffer.byteLength;
            await fs.appendFileSync(filePath,randBuffer)
            await sleep(50);
        }
        await fs.appendFileSync(filePath,new Buffer (RandomGenerator.string(fileSize)))
        return;
    }
    async _md5(filePath:string){
        let fsHash = crypto.createHash('md5')
        let fileInfo = fs.readFileSync(filePath,)
        fsHash.update(fileInfo)
        let md5 = fsHash.digest('hex')
        return md5;
    }
    async createFile(command:BdtLpcCommand):Promise<BdtLpcResp>{
        if(!command.json.fileSize || !command.json.client_name){
            this.m_logger.error(`error command : ${JSON.stringify(command.json)}`)
            return {err:ErrorCode.unknownCommand}
        }
        let peer = this._peerCachePath(command.json.client_name)
        let fileName = `${RandomGenerator.string(10)}.txt`
        let fileSize : number = command.json.fileSize!;
        let filePath = path.join(peer.cache_path.file_upload,`${fileName}`)
        //创建文件夹
        if(!fs.existsSync(peer.cache_path.file_upload)){
            await fs.mkdirpSync(peer.cache_path.file_upload);
        }
        //生成文件
        
        await this._createFile(filePath,fileSize);
        let md5 = await this._md5(filePath);
        return {err:ErrorCode.succ,resp:{
            json : {
                fileName,
                filePath,
                md5
            },
            bytes : Buffer.from("")
        }}
    }
    _peerCachePath(client_name:string){
        return{cache_path :{
            log : path.join(this.m_logger.dir(),`../${client_name}_cache`,"log"),
            file_upload:path.join(this.m_logger.dir(),`../${client_name}_cache`,"file_upload"),
            file_download:path.join(this.m_logger.dir(),`../${client_name}_cache`,"file_download"),
            NamedObject:path.join(this.m_logger.dir(),`../${client_name}_cache`,"NamedObject"),
            logPath : this.m_logger.dir(),
        }}
    }
    async getCachePath(command:BdtLpcCommand):Promise<BdtLpcResp>{
        if( !command.json.client_name){
            this.m_logger.error(`error command : ${JSON.stringify(command.json)}`)
            return {err:ErrorCode.unknownCommand}
        }
        let peer = this._peerCachePath(command.json.client_name)
        return {err:ErrorCode.succ,resp:{
            json : {
                cache_path : peer.cache_path,
            },
            bytes : Buffer.from("")
        }}
    }
    async loadAgentCache(command:BdtLpcCommand):Promise<BdtLpcResp>{
        if( !command.json.agentName){
            this.m_logger.error(`error command : ${JSON.stringify(command.json)}`)
            return {err:ErrorCode.unknownCommand}
        }
        let cachePath = path.join(this.m_logger.dir(),`../../${command.json.agentName}`)
        let LocalDeviceCache =  path.join(cachePath,"LocalDevice")
        let RemoteDeviceCache =  path.join(cachePath,"RemoteDevice")
        if(command.json.init == "clean"){
            fs.removeSync(LocalDeviceCache);
            fs.removeSync(RemoteDeviceCache);
            fs.removeSync(cachePath);
        }
        if(!fs.existsSync(cachePath)){
            fs.mkdirpSync(cachePath);
            fs.mkdirpSync(LocalDeviceCache);
            fs.mkdirpSync(RemoteDeviceCache);
        }
        if(!fs.existsSync(LocalDeviceCache)){
            fs.mkdirpSync(LocalDeviceCache);
        }
        if(!fs.existsSync(RemoteDeviceCache)){
            fs.mkdirpSync(RemoteDeviceCache);
        }
        let local_list = []
        let remote_list = []
        for(let device of fs.readdirSync(LocalDeviceCache)){
            if(device.includes("desc")){
                local_list.push(device);
            }
        }
        for(let device of fs.readdirSync(RemoteDeviceCache)){
            remote_list.push(device);
        }
        return {err:ErrorCode.succ,resp:{
            json : {
                LocalDeviceCache,
                RemoteDeviceCache,
                local_list,
                remote_list,
            },
            bytes : Buffer.from("")
        }}
    }
    async removeAgentCache(command:BdtLpcCommand):Promise<BdtLpcResp>{
        if( !command.json.agentName){
            this.m_logger.error(`error command : ${JSON.stringify(command.json)}`)
            return {err:ErrorCode.unknownCommand}
        }
        let cachePath = path.join(this.m_logger.dir(),`../../${command.json.agentName}`)
        let LocalDeviceCache =  path.join(cachePath,"LocalDevice")
        let RemoteDeviceCache =  path.join(cachePath,"RemoteDevice")
        if(command.json.type == "all"){
            fs.removeSync(LocalDeviceCache);
            fs.removeSync(RemoteDeviceCache);
            fs.removeSync(cachePath);
        }
        if(command.json.type  == "local"){
            fs.removeSync(LocalDeviceCache);
        }
        if(command.json.type  == "remote"){
            fs.removeSync(RemoteDeviceCache);
        }
        return {err:ErrorCode.succ,resp:{
            json : {
                cachePath,
            },
            bytes : Buffer.from("")
        }}
    }
    async createDir(command:BdtLpcCommand):Promise<BdtLpcResp>{
        if( !command.json.client_name|| !command.json.fileSize || !command.json.dirNumber || !command.json.fileNumber || !command.json.deep){
            this.m_logger.error(`error command : ${JSON.stringify(command.json)}`)
            return {err:ErrorCode.unknownCommand}
        }
        let peer = this._peerCachePath(command.json.client_name)
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
    async createPath(command:BdtLpcCommand):Promise<BdtLpcResp>{
        if( !command.json.client_name||  !command.json.dirName){
            this.m_logger.error(`error command : ${JSON.stringify(command.json)}`)
            return {err:ErrorCode.unknownCommand}
        }
        let peer = this._peerCachePath(command.json.client_name)
        let dirName = command.json.dirName;
        let dirPath = path.join(peer.cache_path.file_download,`${dirName}`)
        //创建文件夹
        fs.mkdirpSync(dirPath);
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
    async uploadCacheFile(command:BdtLpcCommand):Promise<BdtLpcResp>{
        if(!command.json.path || !command.json.logName){
            this.m_logger.error(`error command : ${JSON.stringify(command.json)}`)
            return {err:ErrorCode.unknownCommand}
        }
        let zip = await this.m_interface.zip(command.json.path,command.json.logName)
        let upload = await this.m_interface.uploadFile(zip.dstPath!,"logs");
        return {err:ErrorCode.succ,resp:{
            json : {
                upload,
            },
            bytes : Buffer.from("")
        }}
    }
}
