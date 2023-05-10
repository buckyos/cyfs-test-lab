import {ErrorCode, Namespace, BufferWriter, ServiceClientInterface, Logger, sleep} from '../../base';
import{RandomGenerator} from "./generator"
import * as fs from 'fs-extra';
import * as path from 'path';
import * as crypto from 'crypto';


export type BdtLpcCommand = {
    seq?: number;
    bytes: Buffer;
    json: { name: string, id: string } & any
};

export type BdtLpcResp = {
    err: ErrorCode,
    resp?: BdtLpcCommand
};

export class UtilTool {
    private m_interface: ServiceClientInterface
    private cache_kb?: Buffer;
    private cache_mb?: Buffer;
    private cahce_buff?: Buffer; //1000037 大素数
    public cache_path: { file_upload: string, file_download: string };
    private rand_file_running : boolean;
    constructor(_interface: ServiceClientInterface) {
        const root = path.join(_interface.getLogger().dir(),"../dmc_cache")
        let cache_path = {
            file_upload: path.join(root, "file_upload"),
            file_download: path.join(root, "file_download"),
        }
        fs.mkdirpSync(cache_path.file_upload);
        fs.mkdirpSync(cache_path.file_download);
        this.m_interface = _interface;
        this.cache_path = cache_path;
        this.rand_file_running = false;
    }
    async init_cache() {
        if (!this.cache_mb) {
            this.cache_mb = Buffer.from(RandomGenerator.string(1000000));
        }
        this.cache_kb = Buffer.from(RandomGenerator.string(37));
        this.cahce_buff = Buffer.concat([this.cache_kb, this.cache_mb]);
    }

    async util_request(command: BdtLpcCommand): Promise<BdtLpcResp> {
        if (!command.json.name) {
            return { err: ErrorCode.notFound }
        }
        switch (command.json.name) {
            case "create_file": {
                return await this.create_file(command);
            };
            case "create_dir": {
                return await this.create_dir(command);
            };
            case "md5": {
                return await this.md5(command);
            };
            case "get_IP_info": {
                return await this.get_IP_info(command);
            };
            case "upload_log": {
                return await this.upload_log(command);
            };
            case "get_cache_path": {
                return await this.get_cache_path(command);
            }
        }
        console.info(`#### not found utilRequest req_path `)
        return { err: ErrorCode.notFound }
    }
    async _createFile(file_path: string, file_size: number) {
        // 初始化随机cache
        await this.init_cache();
        // 每次往文件中写入质数个bytes,避免chunk 重复
        if(file_size>1*1000*1000){
            let data =  Buffer.from(RandomGenerator.string(RandomGenerator.integer(500*1000,100*1000)));
            await fs.appendFileSync(file_path,  data);
            file_size = file_size -  data.byteLength;
        }
        while (file_size > this.cahce_buff!.byteLength) {
            await fs.appendFileSync(file_path,  this.cahce_buff!)
            file_size = file_size -  this.cahce_buff!.byteLength;
        }
        await fs.appendFileSync(file_path, Buffer.from(RandomGenerator.string(file_size)))
    }
    async _md5(file_path: string) {
        let fsHash = crypto.createHash('md5')
        let fileInfo = fs.readFileSync(file_path,)
        fsHash.update(fileInfo)
        let md5 = fsHash.digest('hex')
        return md5;
    }
    async create_file(command: BdtLpcCommand): Promise<BdtLpcResp> {
        if (command.json.file_size == undefined) {
            console.error(`error command : ${JSON.stringify(command.json)}`)
            return { err: ErrorCode.unknownCommand }
        }
        while(this.rand_file_running){
            await sleep(100);
            console.info(`rand file is running,wait 100 ms`);
        }
        this.rand_file_running = true;
        let file_name = `${RandomGenerator.string(10)}.txt`
        let file_size: number = command.json.file_size!;
        let file_path = path.join(this.cache_path.file_upload, `${file_name}`)
        //创建文件夹
        if (!fs.existsSync(this.cache_path.file_upload)) {
            await fs.mkdirpSync(this.cache_path.file_upload);
        }
        //生成文件
        await this._createFile(file_path, file_size);
        let md5 = await this._md5(file_path);
        this.rand_file_running = false;
        return {
            err: ErrorCode.succ, resp: {
                json: {
                    file_name,
                    file_path,
                    md5
                },
                bytes: Buffer.from("")
            }
        }
    }

    async get_cache_path(command: BdtLpcCommand): Promise<BdtLpcResp> {
        
        return {
            err: ErrorCode.succ, resp: {
                json: {
                    platform : this.m_interface.getPlatform(),
                    cache_path: this.cache_path,
                },
                bytes: Buffer.from("")
            }
        }
    }


    async generate_folders(basePath: string,depth: number, numSubFolders: number, numFiles: number,file_size:number, ) {
        if (depth <= 0 || numSubFolders <= 0 || numFiles <= 0) {
          return;
        }
        if (!fs.existsSync(basePath)) {
          fs.mkdirSync(basePath);
        }
      
        for (let i = 0; i < numSubFolders; i++) {
          const folderPath = path.join(basePath, `folder-${i}`);
          if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath);
          }
      
          for (let j = 0; j < numFiles; j++) {
            let file_path = path.join(folderPath,`${j}_${RandomGenerator.string(10)}.txt`)
            await this._createFile(file_path,file_size);  
          }
      
          this.generate_folders(folderPath,depth - 1, numSubFolders, numFiles,file_size);
        }
      }
    async create_dir(command: BdtLpcCommand): Promise<BdtLpcResp> {
        if (!command.json.file_size || !command.json.dir_number || !command.json.file_number || !command.json.deep) {
            console.error(`error command : ${JSON.stringify(command.json)}`)
            return { err: ErrorCode.unknownCommand }
        }
        let dir_name = RandomGenerator.string(10);
        let dir_path = path.join(this.cache_path.file_upload, `${dir_name}`)
        fs.mkdirpSync(dir_path);
        let result = await this.generate_folders(dir_path,command.json.deep,command.json.dir_number,command.json.file_number,command.json.file_size);
        return {
            err: ErrorCode.succ, resp: {
                json: {
                    dir_name,
                    dir_path,
                },
                bytes: Buffer.from("")
            }
        }
    }
    async md5(command: BdtLpcCommand): Promise<BdtLpcResp> {
        if (!command.json.file_path) {
            console.error(`error command : ${JSON.stringify(command.json)}`)
            return { err: ErrorCode.unknownCommand }
        }
        let md5 = await this._md5(command.json.file_path);
        return {
            err: ErrorCode.succ, resp: {
                json: {
                    md5,
                },
                bytes: Buffer.from("")
            }
        }
    }
    async get_IP_info(command: BdtLpcCommand): Promise<BdtLpcResp> {
        var interfaces = require('os').networkInterfaces();
        console.info(interfaces)
        var IPv4_list: Array<string> = []
        var IPv6_list: Array<string> = []
        for (var devName in interfaces) {
            var iface = interfaces[devName];
            for (var i = 0; i < iface.length; i++) {
                var alias = iface[i];
                if (alias.family == 'IPv4' && alias.address !== '127.0.0.1') { //&& !alias.internal
                    IPv4_list.push(alias.address);
                }
                if (alias.family == 'IPv6' && alias.address !== '127.0.0.1') { //&& !alias.internal
                    IPv6_list.push(alias.address);
                }
            }
        }
        return {
            err: ErrorCode.succ, resp: {
                json: {
                    ipInfo: { IPv4: IPv4_list, IPv6: IPv6_list }
                },
                bytes: Buffer.from("")
            }
        }
    }
    async upload_log(command: BdtLpcCommand): Promise<BdtLpcResp> {
        console.info(`command : ${JSON.stringify(command.json)}`)
        if (!command.json.log_name) {
            console.error(`error command : ${JSON.stringify(command.json)}`)
            return { err: ErrorCode.unknownCommand }
        }

        let zip = await this.m_interface.zip(this.m_interface.getLogger().dir(), command.json.log_name)
        let upload = await this.m_interface.uploadFile(zip.dstPath!, "logs");
        console.info(`upload log to server ,result = ${JSON.stringify(upload)}`)
        return {
            err: ErrorCode.succ, resp: {
                json: {
                    upload,
                },
                bytes: Buffer.from("")
            }
        }
    }

}


