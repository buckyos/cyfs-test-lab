import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, sleep, RandomGenerator} from '../../base';
import {Agent,Peer,BDTERROR} from './type'
export class UtilClient {
    public peerName: string; //  
    private m_agentid: string;
    private logger : Logger; 
    private m_interface: TaskClientInterface;
    public tags:string;
    constructor(_interface: TaskClientInterface,agentid:string,tags:string,peerName:string) {

        this.m_agentid = agentid;
        this.tags = tags;
        this.m_interface = _interface;
        this.logger = _interface.getLogger();
        this.peerName = peerName;
    }
    async createFile(fileSize:number):Promise<{err:ErrorCode,log?:string,fileName?:string,filePath?:string,md5?:string}>{
        let result = await this.m_interface.callApi('utilRequest', Buffer.from(''), {
            name : "createFile",
            peerName: this.peerName,
            fileSize,
        }, this.m_agentid!, 10*1000);
        this.logger.info(`${this.tags} createFile = ${JSON.stringify(result)}`)
        if(result.err ){  
            return {err:ErrorCode.exception,log:`${this.tags} createFile failed`}
        }
        return {err:ErrorCode.exception,log:`${this.tags} createFile success`,fileName:result.value.fileName,filePath:result.value.filePath,md5:result.value.md5}
    }
    async createDir(fileNumber:number,fileSize:number,dirNumber:number,deep:string):Promise<{err:ErrorCode,log?:string,dirName?:string,dirPath?:string}>{
        let result = await this.m_interface.callApi('utilRequest', Buffer.from(''), {
            name : "createDir",
            peerName: this.peerName,
            dirNumber,
            fileNumber,
            deep,
            fileSize,
        }, this.m_agentid!, 10*1000);
        this.logger.info(`${this.tags} createDir = ${JSON.stringify(result)}`)
        if(result.err ){  
            return {err:ErrorCode.exception,log:`${this.tags} createDir failed`}
        }
        return {err:ErrorCode.exception,log:`${this.tags} createDir success`,dirName:result.value.ddirName,dirPath:result.value.dirPath,}
    }
    async md5File(filePath:string):Promise<{err:ErrorCode,md5?:string}>{
        let result = await this.m_interface.callApi('utilRequest', Buffer.from(''), {
            name : "md5",
            peerName: this.peerName,
            filePath,
        }, this.m_agentid!, 10*1000);
        this.logger.info(`${this.tags} md5File = ${JSON.stringify(result)}`)
        if(result.err ){  
            return {err:ErrorCode.exception}
        }
        return {err:ErrorCode.exception,md5:result.value.md5}
    }
    async getCachePath():Promise<{err:ErrorCode,cache_path? : {file_upload:string,file_download:string,NamedObject:string}}>{
        let result = await this.m_interface.callApi('utilRequest', Buffer.from(''), {
            name : "getCachePath",
            peerName: this.peerName,
        }, this.m_agentid!, 10*1000);
        this.logger.info(`${this.tags} getCachePath = ${JSON.stringify(result)}`)
        if(result.err ){  
            return {err:ErrorCode.exception}
        }
        return {err:ErrorCode.exception,cache_path:result.value.cache_path}
    }  
}
