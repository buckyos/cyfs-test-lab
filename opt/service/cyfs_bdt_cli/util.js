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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UtilTool = void 0;
const base_1 = require("../../base");
const generator_1 = require("./generator");
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
class UtilTool {
    constructor(_interface, logger) {
        this.m_logger = logger;
        this.m_interface = _interface;
    }
    async utilRequest(command) {
        if (!command.json.name) {
            return { err: base_1.ErrorCode.notFound };
        }
        switch (command.json.name) {
            case "createFile":
                {
                    return await this.createFile(command);
                }
                ;
            case "createDir":
                {
                    return await this.createDir(command);
                }
                ;
            case "createPath":
                {
                    return await this.createPath(command);
                }
                ;
            case "md5":
                {
                    return await this.md5(command);
                }
                ;
            case "getIPInfo":
                {
                    return await this.getIPInfo(command);
                }
                ;
            case "uploadLog":
                {
                    return await this.uploadLog(command);
                }
                ;
            case "uploadCacheFile":
                {
                    return await this.uploadCacheFile(command);
                }
                ;
            case "getCachePath":
                {
                    return await this.getCachePath(command);
                }
                ;
            case "removeNdcData": {
                return await this.removeNdcData(command);
            }
            case "loadAgentCache": {
                return await this.loadAgentCache(command);
            }
            case "removeAgentCache": {
                return await this.removeAgentCache(command);
            }
            case "check_version": {
                return await this.removeAgentCache(command);
            }
        }
        this.m_logger.info(`#### not found utilRequest req_path `);
        return { err: base_1.ErrorCode.notFound };
    }
    async removeNdcData(command) {
        let platform = this.m_interface.getPlatform();
        let cyfs_data = "/cyfs/data";
        if (platform == 'win32') {
            cyfs_data = "c:\\cyfs\\data";
        }
        else if (platform == 'win32') {
            cyfs_data = "/cyfs/data";
        }
        let remove_list = [];
        let dir_list = fs.readdirSync(cyfs_data);
        for (let cache_path of dir_list) {
            if (cache_path.includes("5a")) {
                let r_path = path.join(cyfs_data, cache_path);
                fs.removeSync(r_path);
                remove_list.push(r_path);
            }
        }
        return { err: base_1.ErrorCode.succ, resp: {
                json: {
                    remove_list
                },
                bytes: Buffer.from("")
            } };
    }
    async _createFile(filePath, fileSize) {
        if (!this.cacheSomeBuffer) {
            this.cacheSomeBuffer = Buffer.from(generator_1.RandomGenerator.string(1000 * 1000));
        }
        let same = this.cacheSomeBuffer;
        let randBuffer = new Buffer('');
        while (fileSize > (same.length + 200)) {
            //randBuffer = Buffer.concat([randBuffer,new Buffer ( RandomGenerator.string(100)),same,new Buffer ( RandomGenerator.string(100))]);
            await fs.appendFileSync(filePath, this.cacheSomeBuffer);
            fileSize = fileSize - this.cacheSomeBuffer.byteLength;
            randBuffer = Buffer.from(generator_1.RandomGenerator.string(100));
            fileSize = fileSize - randBuffer.byteLength;
            await fs.appendFileSync(filePath, randBuffer);
            await base_1.sleep(50);
        }
        await fs.appendFileSync(filePath, new Buffer(generator_1.RandomGenerator.string(fileSize)));
        return;
    }
    async _md5(filePath) {
        let fsHash = crypto.createHash('md5');
        let fileInfo = fs.readFileSync(filePath);
        fsHash.update(fileInfo);
        let md5 = fsHash.digest('hex');
        return md5;
    }
    async createFile(command) {
        if (!command.json.fileSize || !command.json.client_name) {
            this.m_logger.error(`error command : ${JSON.stringify(command.json)}`);
            return { err: base_1.ErrorCode.unknownCommand };
        }
        let peer = this._peerCachePath(command.json.client_name);
        let fileName = `${generator_1.RandomGenerator.string(10)}.txt`;
        let fileSize = command.json.fileSize;
        let filePath = path.join(peer.cache_path.file_upload, `${fileName}`);
        //创建文件夹
        if (!fs.existsSync(peer.cache_path.file_upload)) {
            await fs.mkdirpSync(peer.cache_path.file_upload);
        }
        //生成文件
        await this._createFile(filePath, fileSize);
        let md5 = await this._md5(filePath);
        return { err: base_1.ErrorCode.succ, resp: {
                json: {
                    fileName,
                    filePath,
                    md5
                },
                bytes: Buffer.from("")
            } };
    }
    _peerCachePath(client_name) {
        return { cache_path: {
                log: path.join(this.m_logger.dir(), `../${client_name}_cache`, "log"),
                file_upload: path.join(this.m_logger.dir(), `../${client_name}_cache`, "file_upload"),
                file_download: path.join(this.m_logger.dir(), `../${client_name}_cache`, "file_download"),
                NamedObject: path.join(this.m_logger.dir(), `../${client_name}_cache`, "NamedObject"),
                logPath: this.m_logger.dir(),
            } };
    }
    async getCachePath(command) {
        if (!command.json.client_name) {
            this.m_logger.error(`error command : ${JSON.stringify(command.json)}`);
            return { err: base_1.ErrorCode.unknownCommand };
        }
        let peer = this._peerCachePath(command.json.client_name);
        return { err: base_1.ErrorCode.succ, resp: {
                json: {
                    cache_path: peer.cache_path,
                },
                bytes: Buffer.from("")
            } };
    }
    async loadAgentCache(command) {
        if (!command.json.agentName) {
            this.m_logger.error(`error command : ${JSON.stringify(command.json)}`);
            return { err: base_1.ErrorCode.unknownCommand };
        }
        let cachePath = path.join(this.m_logger.dir(), `../../${command.json.agentName}`);
        let LocalDeviceCache = path.join(cachePath, "LocalDevice");
        let RemoteDeviceCache = path.join(cachePath, "RemoteDevice");
        if (command.json.init == "clean") {
            fs.removeSync(LocalDeviceCache);
            fs.removeSync(RemoteDeviceCache);
            fs.removeSync(cachePath);
        }
        if (!fs.existsSync(cachePath)) {
            fs.mkdirpSync(cachePath);
            fs.mkdirpSync(LocalDeviceCache);
            fs.mkdirpSync(RemoteDeviceCache);
        }
        if (!fs.existsSync(LocalDeviceCache)) {
            fs.mkdirpSync(LocalDeviceCache);
        }
        if (!fs.existsSync(RemoteDeviceCache)) {
            fs.mkdirpSync(RemoteDeviceCache);
        }
        let local_list = [];
        let remote_list = [];
        for (let device of fs.readdirSync(LocalDeviceCache)) {
            if (device.includes("desc")) {
                local_list.push(device);
            }
        }
        for (let device of fs.readdirSync(RemoteDeviceCache)) {
            remote_list.push(device);
        }
        return { err: base_1.ErrorCode.succ, resp: {
                json: {
                    LocalDeviceCache,
                    RemoteDeviceCache,
                    local_list,
                    remote_list,
                },
                bytes: Buffer.from("")
            } };
    }
    async removeAgentCache(command) {
        if (!command.json.agentName) {
            this.m_logger.error(`error command : ${JSON.stringify(command.json)}`);
            return { err: base_1.ErrorCode.unknownCommand };
        }
        let cachePath = path.join(this.m_logger.dir(), `../../${command.json.agentName}`);
        let LocalDeviceCache = path.join(cachePath, "LocalDevice");
        let RemoteDeviceCache = path.join(cachePath, "RemoteDevice");
        if (command.json.type == "all") {
            fs.removeSync(LocalDeviceCache);
            fs.removeSync(RemoteDeviceCache);
            fs.removeSync(cachePath);
        }
        if (command.json.type == "local") {
            fs.removeSync(LocalDeviceCache);
        }
        if (command.json.type == "remote") {
            fs.removeSync(RemoteDeviceCache);
        }
        return { err: base_1.ErrorCode.succ, resp: {
                json: {
                    cachePath,
                },
                bytes: Buffer.from("")
            } };
    }
    async createDir(command) {
        if (!command.json.client_name || !command.json.fileSize || !command.json.dirNumber || !command.json.fileNumber || !command.json.deep) {
            this.m_logger.error(`error command : ${JSON.stringify(command.json)}`);
            return { err: base_1.ErrorCode.unknownCommand };
        }
        let peer = this._peerCachePath(command.json.client_name);
        let dirName = generator_1.RandomGenerator.string(10);
        let dirPath = path.join(peer.cache_path.file_upload, `${dirName}`);
        //创建文件夹
        if (!fs.existsSync(peer.cache_path.file_upload)) {
            await fs.mkdirpSync(peer.cache_path.file_upload);
        }
        await generator_1.RandomGenerator.createRandomDir(dirPath, command.json.dirNumber, command.json.fileNumber, command.json.fileSize, command.json.deep);
        return { err: base_1.ErrorCode.succ, resp: {
                json: {
                    dirName,
                    dirPath,
                },
                bytes: Buffer.from("")
            } };
    }
    async createPath(command) {
        if (!command.json.client_name || !command.json.dirName) {
            this.m_logger.error(`error command : ${JSON.stringify(command.json)}`);
            return { err: base_1.ErrorCode.unknownCommand };
        }
        let peer = this._peerCachePath(command.json.client_name);
        let dirName = command.json.dirName;
        let dirPath = path.join(peer.cache_path.file_download, `${dirName}`);
        //创建文件夹
        fs.mkdirpSync(dirPath);
        return { err: base_1.ErrorCode.succ, resp: {
                json: {
                    dirName,
                    dirPath,
                },
                bytes: Buffer.from("")
            } };
    }
    async md5(command) {
        if (!command.json.filePath) {
            this.m_logger.error(`error command : ${JSON.stringify(command.json)}`);
            return { err: base_1.ErrorCode.unknownCommand };
        }
        let md5 = await this._md5(command.json.filePath);
        return { err: base_1.ErrorCode.succ, resp: {
                json: {
                    md5,
                },
                bytes: Buffer.from("")
            } };
    }
    async getIPInfo(command) {
        var interfaces = require('os').networkInterfaces();
        this.m_logger.info(interfaces);
        var IPv4List = [];
        var IPv6List = [];
        for (var devName in interfaces) {
            var iface = interfaces[devName];
            for (var i = 0; i < iface.length; i++) {
                var alias = iface[i];
                if (alias.family == 'IPv4' && alias.address !== '127.0.0.1') { //&& !alias.internal
                    IPv4List.push(alias.address);
                }
                if (alias.family == 'IPv6' && alias.address !== '127.0.0.1') { //&& !alias.internal
                    IPv6List.push(alias.address);
                }
            }
        }
        return { err: base_1.ErrorCode.succ, resp: {
                json: {
                    ipInfo: { IPv4: IPv4List, IPv6: IPv6List }
                },
                bytes: Buffer.from("")
            } };
    }
    async uploadLog(command) {
        this.m_logger.info(`command : ${JSON.stringify(command.json)}`);
        if (!command.json.log_name) {
            this.m_logger.error(`error command : ${JSON.stringify(command.json)}`);
            return { err: base_1.ErrorCode.unknownCommand };
        }
        let zip = await this.m_interface.zip(this.m_logger.dir(), command.json.log_name);
        let upload = await this.m_interface.uploadFile(zip.dstPath, "logs");
        this.m_logger.info(`upload log to server ,result = ${JSON.stringify(upload)}`);
        return { err: base_1.ErrorCode.succ, resp: {
                json: {
                    upload,
                },
                bytes: Buffer.from("")
            } };
    }
    async uploadCacheFile(command) {
        if (!command.json.path || !command.json.logName) {
            this.m_logger.error(`error command : ${JSON.stringify(command.json)}`);
            return { err: base_1.ErrorCode.unknownCommand };
        }
        let zip = await this.m_interface.zip(command.json.path, command.json.logName);
        let upload = await this.m_interface.uploadFile(zip.dstPath, "logs");
        return { err: base_1.ErrorCode.succ, resp: {
                json: {
                    upload,
                },
                bytes: Buffer.from("")
            } };
    }
}
exports.UtilTool = UtilTool;
