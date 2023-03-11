import {ErrorCode, NetEntry, Namespace, AccessNetType, BufferReader, Logger, TaskClientInterface, ClientExitCode, BufferWriter, sleep, RandomGenerator} from '../../base';
import {Agent,Peer,BDTERROR} from './type'
export class UtilClient {
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
    async createFile(fileSize:number):Promise<{err:ErrorCode,log?:string,fileName?:string,filePath?:string,md5?:string}>{
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
    async createDir(fileNumber:number,fileSize:number,dirNumber:number,deep:number):Promise<{err:ErrorCode,log?:string,dirName?:string,dirPath?:string}>{
        let result = await this.m_interface.callApi('utilRequest', Buffer.from(''), {
            name : "createDir",
            client_name: this.client_name,
            dirNumber,
            fileNumber,
            deep,
            fileSize,
        }, this.m_agentid!, 10*1000);
        this.logger.info(`${this.tags} createDir = ${JSON.stringify(result)}`)
        if(result.err ){  
            return {err:ErrorCode.exception,log:`${this.tags} createDir failed`}
        }
        return {err:ErrorCode.succ,log:`${this.tags} createDir success`,dirName:result.value.dirName,dirPath:result.value.dirPath,}
    }
    async createPath(dirName:string):Promise<{err:ErrorCode,log?:string,dirName?:string,dirPath?:string}>{
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
    async md5File(filePath:string):Promise<{err:ErrorCode,md5?:string}>{
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
    async getCachePath():Promise<{err:ErrorCode,cache_path? : {file_upload:string,file_download:string,NamedObject:string,logPath?:string}}>{
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
    
    async remove_ndc_data():Promise<{err:ErrorCode,remove_list?:string}>{
        let result = await this.m_interface.callApi('utilRequest', Buffer.from(''), {
            name : "remove_ndc_data",
            client_name: this.client_name,
        }, this.m_agentid!, 10*1000);
        this.logger.info(`${this.tags} remove_ndc_data = ${JSON.stringify(result)}`)
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
}