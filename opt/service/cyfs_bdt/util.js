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
        this.init();
    }
    async init() {
        this.cacheSomeBuffer = Buffer.from(generator_1.RandomGenerator.string(1000 * 1000));
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
        if (!command.json.fileSize || !command.json.peerName) {
            this.m_logger.error(`error command : ${JSON.stringify(command.json)}`);
            return { err: base_1.ErrorCode.unknownCommand };
        }
        let peer = this._peerCachePath(command.json.peerName);
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
    _peerCachePath(peerName) {
        return { cache_path: {
                file_upload: path.join(this.m_logger.dir(), `../${peerName}_cache`, "file_upload"),
                file_download: path.join(this.m_logger.dir(), `../${peerName}_cache`, "file_download"),
                NamedObject: path.join(this.m_logger.dir(), `../${peerName}_cache`, "NamedObject"),
                logPath: this.m_logger.dir(),
            } };
    }
    async getCachePath(command) {
        if (!command.json.peerName) {
            this.m_logger.error(`error command : ${JSON.stringify(command.json)}`);
            return { err: base_1.ErrorCode.unknownCommand };
        }
        let peer = this._peerCachePath(command.json.peerName);
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
        if (!command.json.peerName || !command.json.fileSize || !command.json.dirNumber || !command.json.fileNumber || !command.json.deep) {
            this.m_logger.error(`error command : ${JSON.stringify(command.json)}`);
            return { err: base_1.ErrorCode.unknownCommand };
        }
        let peer = this._peerCachePath(command.json.peerName);
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
        if (!command.json.peerName || !command.json.dirName) {
            this.m_logger.error(`error command : ${JSON.stringify(command.json)}`);
            return { err: base_1.ErrorCode.unknownCommand };
        }
        let peer = this._peerCachePath(command.json.peerName);
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
        if (!command.json.logName) {
            this.m_logger.error(`error command : ${JSON.stringify(command.json)}`);
            return { err: base_1.ErrorCode.unknownCommand };
        }
        let zip = await this.m_interface.zip(this.m_interface.getLogger().dir(), command.json.logName);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9ub2RlLXRlc3Rlci1hcHAvc2VydmljZS9jeWZzX2JkdC91dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxxQ0FBcUc7QUFDckcsMkNBQTBDO0FBRzFDLDZDQUErQjtBQUMvQiwyQ0FBNkI7QUFDN0IsK0NBQWlDO0FBS2pDLE1BQWEsUUFBUTtJQUlqQixZQUFZLFVBQWlDLEVBQUMsTUFBYTtRQUN2RCxJQUFJLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQztRQUN2QixJQUFJLENBQUMsV0FBVyxHQUFHLFVBQVUsQ0FBQztRQUM5QixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDaEIsQ0FBQztJQUNELEtBQUssQ0FBRSxJQUFJO1FBQ1AsSUFBSSxDQUFDLGVBQWUsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLDJCQUFlLENBQUMsTUFBTSxDQUFDLElBQUksR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFFO0lBQzNFLENBQUM7SUFFRCxLQUFLLENBQUMsV0FBVyxDQUFDLE9BQXFCO1FBQ25DLElBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksRUFBQztZQUNsQixPQUFPLEVBQUMsR0FBRyxFQUFDLGdCQUFTLENBQUMsUUFBUSxFQUFDLENBQUE7U0FDbEM7UUFDRCxRQUFPLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFDO1lBQ3JCLEtBQUssWUFBWTtnQkFBRztvQkFDaEIsT0FBTyxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7aUJBQ3pDO2dCQUFBLENBQUM7WUFDRixLQUFLLFdBQVc7Z0JBQUc7b0JBQ2YsT0FBUSxNQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7aUJBQ3pDO2dCQUFBLENBQUM7WUFDRixLQUFLLFlBQVk7Z0JBQUc7b0JBQ2hCLE9BQVEsTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFD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QUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUM1RSxJQUFJLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxPQUFRLEVBQUMsTUFBTSxDQUFDLENBQUM7UUFDcEUsT0FBTyxFQUFDLEdBQUcsRUFBQyxnQkFBUyxDQUFDLElBQUksRUFBQyxJQUFJLEVBQUM7Z0JBQzVCLElBQUksRUFBRztvQkFDSCxNQUFNO2lCQUNUO2dCQUNELEtBQUssRUFBRyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQzthQUMxQixFQUFDLENBQUE7SUFDTixDQUFDO0NBQ0o7QUE1VUQsNEJBNFVDIiwiZmlsZSI6InNlcnZpY2UvY3lmc19iZHQvdXRpbC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7RXJyb3JDb2RlLCBOYW1lc3BhY2UsIEJ1ZmZlcldyaXRlciwgU2VydmljZUNsaWVudEludGVyZmFjZSwgTG9nZ2VyLCBzbGVlcH0gZnJvbSAnLi4vLi4vYmFzZSc7XHJcbmltcG9ydHtSYW5kb21HZW5lcmF0b3J9IGZyb20gXCIuL2dlbmVyYXRvclwiXHJcbmltcG9ydCB7IEJkdExwYywgQmR0THBjQ29tbWFuZCAsQmR0THBjUmVzcH0gZnJvbSAnLi9scGMnO1xyXG5pbXBvcnQgeyBCZHRQZWVyIH0gZnJvbSAnLi9wZWVyJztcclxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgKiBhcyBjcnlwdG8gZnJvbSAnY3J5cHRvJztcclxuXHJcblxyXG5cclxuXHJcbmV4cG9ydCBjbGFzcyBVdGlsVG9vbCB7XHJcbiAgICBwcml2YXRlIG1faW50ZXJmYWNlOlNlcnZpY2VDbGllbnRJbnRlcmZhY2VcclxuICAgIHByaXZhdGUgbV9sb2dnZXI6IExvZ2dlcjtcclxuICAgIHByaXZhdGUgY2FjaGVTb21lQnVmZmVyPzogQnVmZmVyO1xyXG4gICAgY29uc3RydWN0b3IoX2ludGVyZmFjZTpTZXJ2aWNlQ2xpZW50SW50ZXJmYWNlLGxvZ2dlcjpMb2dnZXIpe1xyXG4gICAgICAgIHRoaXMubV9sb2dnZXIgPSBsb2dnZXI7XHJcbiAgICAgICAgdGhpcy5tX2ludGVyZmFjZSA9IF9pbnRlcmZhY2U7XHJcbiAgICAgICAgdGhpcy5pbml0KCk7XHJcbiAgICB9XHJcbiAgICBhc3luYyAgaW5pdCgpIHtcclxuICAgICAgICB0aGlzLmNhY2hlU29tZUJ1ZmZlciA9IEJ1ZmZlci5mcm9tKFJhbmRvbUdlbmVyYXRvci5zdHJpbmcoMTAwMCoxMDAwKSkgO1xyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIHV0aWxSZXF1ZXN0KGNvbW1hbmQ6QmR0THBjQ29tbWFuZCk6UHJvbWlzZTxCZHRMcGNSZXNwPntcclxuICAgICAgICBpZighY29tbWFuZC5qc29uLm5hbWUpe1xyXG4gICAgICAgICAgICByZXR1cm4ge2VycjpFcnJvckNvZGUubm90Rm91bmR9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHN3aXRjaChjb21tYW5kLmpzb24ubmFtZSl7XHJcbiAgICAgICAgICAgIGNhc2UgXCJjcmVhdGVGaWxlXCIgOiB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5jcmVhdGVGaWxlKGNvbW1hbmQpO1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBjYXNlIFwiY3JlYXRlRGlyXCIgOiB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gIGF3YWl0IHRoaXMuY3JlYXRlRGlyKGNvbW1hbmQpO1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBjYXNlIFwiY3JlYXRlUGF0aFwiIDoge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuICBhd2FpdCB0aGlzLmNyZWF0ZVBhdGgoY29tbWFuZCk7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGNhc2UgXCJtZDVcIiA6IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLm1kNShjb21tYW5kKTtcclxuICAgICAgICAgICAgfTsgXHJcbiAgICAgICAgICAgIGNhc2UgXCJnZXRJUEluZm9cIiA6IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAgYXdhaXQgdGhpcy5nZXRJUEluZm8oY29tbWFuZCk7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGNhc2UgXCJ1cGxvYWRMb2dcIjp7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy51cGxvYWRMb2coY29tbWFuZCk7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGNhc2UgXCJ1cGxvYWRDYWNoZUZpbGVcIjp7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy51cGxvYWRDYWNoZUZpbGUoY29tbWFuZCk7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGNhc2UgXCJnZXRDYWNoZVBhdGhcIjp7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXRDYWNoZVBhdGgoY29tbWFuZCk7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGNhc2UgXCJyZW1vdmVOZGNEYXRhXCI6e1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmVtb3ZlTmRjRGF0YShjb21tYW5kKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXNlIFwibG9hZEFnZW50Q2FjaGVcIjp7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5sb2FkQWdlbnRDYWNoZShjb21tYW5kKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXNlIFwicmVtb3ZlQWdlbnRDYWNoZVwiOntcclxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnJlbW92ZUFnZW50Q2FjaGUoY29tbWFuZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2FzZSBcImNoZWNrX3ZlcnNpb25cIjp7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5yZW1vdmVBZ2VudENhY2hlKGNvbW1hbmQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMubV9sb2dnZXIuaW5mbyhgIyMjIyBub3QgZm91bmQgdXRpbFJlcXVlc3QgcmVxX3BhdGggYClcclxuICAgICAgICByZXR1cm4ge2VycjpFcnJvckNvZGUubm90Rm91bmR9XHJcbiAgICB9XHJcbiAgICBhc3luYyByZW1vdmVOZGNEYXRhKGNvbW1hbmQ6QmR0THBjQ29tbWFuZCk6UHJvbWlzZTxCZHRMcGNSZXNwPntcclxuICAgICAgICBsZXQgcGxhdGZvcm0gPSB0aGlzLm1faW50ZXJmYWNlLmdldFBsYXRmb3JtKCk7XHJcbiAgICAgICAgbGV0IGN5ZnNfZGF0YSA9IFwiL2N5ZnMvZGF0YVwiXHJcbiAgICAgICAgaWYocGxhdGZvcm0gPT0gJ3dpbjMyJyl7XHJcbiAgICAgICAgICAgIGN5ZnNfZGF0YSA9IFwiYzpcXFxcY3lmc1xcXFxkYXRhXCJcclxuICAgICAgICB9ZWxzZSBpZihwbGF0Zm9ybSA9PSAnd2luMzInKXtcclxuICAgICAgICAgICAgY3lmc19kYXRhID0gXCIvY3lmcy9kYXRhXCJcclxuICAgICAgICB9XHJcbiAgICAgICAgbGV0IHJlbW92ZV9saXN0ID0gW107XHJcbiAgICAgICAgbGV0IGRpcl9saXN0ID0gZnMucmVhZGRpclN5bmMoY3lmc19kYXRhKTtcclxuICAgICAgICBmb3IobGV0IGNhY2hlX3BhdGggb2YgZGlyX2xpc3Qpe1xyXG4gICAgICAgICAgICBpZihjYWNoZV9wYXRoLmluY2x1ZGVzKFwiNWFcIikpe1xyXG4gICAgICAgICAgICAgICAgbGV0IHJfcGF0aCA9IHBhdGguam9pbihjeWZzX2RhdGEsY2FjaGVfcGF0aClcclxuICAgICAgICAgICAgICAgIGZzLnJlbW92ZVN5bmMocl9wYXRoKTtcclxuICAgICAgICAgICAgICAgIHJlbW92ZV9saXN0LnB1c2gocl9wYXRoKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB7ZXJyOkVycm9yQ29kZS5zdWNjLHJlc3A6e1xyXG4gICAgICAgICAgICBqc29uIDoge1xyXG4gICAgICAgICAgICAgICAgcmVtb3ZlX2xpc3RcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgYnl0ZXMgOiBCdWZmZXIuZnJvbShcIlwiKVxyXG4gICAgICAgIH19XHJcbiAgICB9XHJcbiAgICBhc3luYyBfY3JlYXRlRmlsZShmaWxlUGF0aDpzdHJpbmcsZmlsZVNpemU6bnVtYmVyKXtcclxuICAgICAgICBpZighdGhpcy5jYWNoZVNvbWVCdWZmZXIpe1xyXG4gICAgICAgICAgICB0aGlzLmNhY2hlU29tZUJ1ZmZlciA9IEJ1ZmZlci5mcm9tKFJhbmRvbUdlbmVyYXRvci5zdHJpbmcoMTAwMCoxMDAwKSkgO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICBsZXQgc2FtZSA9IHRoaXMuY2FjaGVTb21lQnVmZmVyO1xyXG4gICAgICAgIGxldCByYW5kQnVmZmVyID0gbmV3IEJ1ZmZlcignJyk7IFxyXG4gICAgICAgIHdoaWxlKGZpbGVTaXplPihzYW1lLmxlbmd0aCsyMDApKXtcclxuICAgICAgICAgICAgLy9yYW5kQnVmZmVyID0gQnVmZmVyLmNvbmNhdChbcmFuZEJ1ZmZlcixuZXcgQnVmZmVyICggUmFuZG9tR2VuZXJhdG9yLnN0cmluZygxMDApKSxzYW1lLG5ldyBCdWZmZXIgKCBSYW5kb21HZW5lcmF0b3Iuc3RyaW5nKDEwMCkpXSk7XHJcbiAgICAgICAgICAgIGF3YWl0IGZzLmFwcGVuZEZpbGVTeW5jKGZpbGVQYXRoLHRoaXMuY2FjaGVTb21lQnVmZmVyKVxyXG4gICAgICAgICAgICBmaWxlU2l6ZSA9IGZpbGVTaXplIC0gdGhpcy5jYWNoZVNvbWVCdWZmZXIuYnl0ZUxlbmd0aDtcclxuICAgICAgICAgICAgcmFuZEJ1ZmZlciA9IEJ1ZmZlci5mcm9tKFJhbmRvbUdlbmVyYXRvci5zdHJpbmcoMTAwKSlcclxuICAgICAgICAgICAgZmlsZVNpemUgPSBmaWxlU2l6ZSAtIHJhbmRCdWZmZXIuYnl0ZUxlbmd0aDtcclxuICAgICAgICAgICAgYXdhaXQgZnMuYXBwZW5kRmlsZVN5bmMoZmlsZVBhdGgscmFuZEJ1ZmZlcilcclxuICAgICAgICAgICAgYXdhaXQgc2xlZXAoNTApO1xyXG4gICAgICAgIH1cclxuICAgICAgICBhd2FpdCBmcy5hcHBlbmRGaWxlU3luYyhmaWxlUGF0aCxuZXcgQnVmZmVyIChSYW5kb21HZW5lcmF0b3Iuc3RyaW5nKGZpbGVTaXplKSkpXHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgYXN5bmMgX21kNShmaWxlUGF0aDpzdHJpbmcpe1xyXG4gICAgICAgIGxldCBmc0hhc2ggPSBjcnlwdG8uY3JlYXRlSGFzaCgnbWQ1JylcclxuICAgICAgICBsZXQgZmlsZUluZm8gPSBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsKVxyXG4gICAgICAgIGZzSGFzaC51cGRhdGUoZmlsZUluZm8pXHJcbiAgICAgICAgbGV0IG1kNSA9IGZzSGFzaC5kaWdlc3QoJ2hleCcpXHJcbiAgICAgICAgcmV0dXJuIG1kNTtcclxuICAgIH1cclxuICAgIGFzeW5jIGNyZWF0ZUZpbGUoY29tbWFuZDpCZHRMcGNDb21tYW5kKTpQcm9taXNlPEJkdExwY1Jlc3A+e1xyXG4gICAgICAgIGlmKCFjb21tYW5kLmpzb24uZmlsZVNpemUgfHwgIWNvbW1hbmQuanNvbi5wZWVyTmFtZSl7XHJcbiAgICAgICAgICAgIHRoaXMubV9sb2dnZXIuZXJyb3IoYGVycm9yIGNvbW1hbmQgOiAke0pTT04uc3RyaW5naWZ5KGNvbW1hbmQuanNvbil9YClcclxuICAgICAgICAgICAgcmV0dXJuIHtlcnI6RXJyb3JDb2RlLnVua25vd25Db21tYW5kfVxyXG4gICAgICAgIH1cclxuICAgICAgICBsZXQgcGVlciA9IHRoaXMuX3BlZXJDYWNoZVBhdGgoY29tbWFuZC5qc29uLnBlZXJOYW1lKVxyXG4gICAgICAgIGxldCBmaWxlTmFtZSA9IGAke1JhbmRvbUdlbmVyYXRvci5zdHJpbmcoMTApfS50eHRgXHJcbiAgICAgICAgbGV0IGZpbGVTaXplIDogbnVtYmVyID0gY29tbWFuZC5qc29uLmZpbGVTaXplITtcclxuICAgICAgICBsZXQgZmlsZVBhdGggPSBwYXRoLmpvaW4ocGVlci5jYWNoZV9wYXRoLmZpbGVfdXBsb2FkLGAke2ZpbGVOYW1lfWApXHJcbiAgICAgICAgLy/liJvlu7rmlofku7blpLlcclxuICAgICAgICBpZighZnMuZXhpc3RzU3luYyhwZWVyLmNhY2hlX3BhdGguZmlsZV91cGxvYWQpKXtcclxuICAgICAgICAgICAgYXdhaXQgZnMubWtkaXJwU3luYyhwZWVyLmNhY2hlX3BhdGguZmlsZV91cGxvYWQpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvL+eUn+aIkOaWh+S7tlxyXG4gICAgICAgIFxyXG4gICAgICAgIGF3YWl0IHRoaXMuX2NyZWF0ZUZpbGUoZmlsZVBhdGgsZmlsZVNpemUpO1xyXG4gICAgICAgIGxldCBtZDUgPSBhd2FpdCB0aGlzLl9tZDUoZmlsZVBhdGgpO1xyXG4gICAgICAgIHJldHVybiB7ZXJyOkVycm9yQ29kZS5zdWNjLHJlc3A6e1xyXG4gICAgICAgICAgICBqc29uIDoge1xyXG4gICAgICAgICAgICAgICAgZmlsZU5hbWUsXHJcbiAgICAgICAgICAgICAgICBmaWxlUGF0aCxcclxuICAgICAgICAgICAgICAgIG1kNVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBieXRlcyA6IEJ1ZmZlci5mcm9tKFwiXCIpXHJcbiAgICAgICAgfX1cclxuICAgIH1cclxuICAgIF9wZWVyQ2FjaGVQYXRoKHBlZXJOYW1lOnN0cmluZyl7XHJcbiAgICAgICAgcmV0dXJue2NhY2hlX3BhdGggOntcclxuICAgICAgICAgICAgZmlsZV91cGxvYWQ6cGF0aC5qb2luKHRoaXMubV9sb2dnZXIuZGlyKCksYC4uLyR7cGVlck5hbWV9X2NhY2hlYCxcImZpbGVfdXBsb2FkXCIpLFxyXG4gICAgICAgICAgICBmaWxlX2Rvd25sb2FkOnBhdGguam9pbih0aGlzLm1fbG9nZ2VyLmRpcigpLGAuLi8ke3BlZXJOYW1lfV9jYWNoZWAsXCJmaWxlX2Rvd25sb2FkXCIpLFxyXG4gICAgICAgICAgICBOYW1lZE9iamVjdDpwYXRoLmpvaW4odGhpcy5tX2xvZ2dlci5kaXIoKSxgLi4vJHtwZWVyTmFtZX1fY2FjaGVgLFwiTmFtZWRPYmplY3RcIiksXHJcbiAgICAgICAgICAgIGxvZ1BhdGggOiB0aGlzLm1fbG9nZ2VyLmRpcigpLFxyXG4gICAgICAgIH19XHJcbiAgICB9XHJcbiAgICBhc3luYyBnZXRDYWNoZVBhdGgoY29tbWFuZDpCZHRMcGNDb21tYW5kKTpQcm9taXNlPEJkdExwY1Jlc3A+e1xyXG4gICAgICAgIGlmKCAhY29tbWFuZC5qc29uLnBlZXJOYW1lKXtcclxuICAgICAgICAgICAgdGhpcy5tX2xvZ2dlci5lcnJvcihgZXJyb3IgY29tbWFuZCA6ICR7SlNPTi5zdHJpbmdpZnkoY29tbWFuZC5qc29uKX1gKVxyXG4gICAgICAgICAgICByZXR1cm4ge2VycjpFcnJvckNvZGUudW5rbm93bkNvbW1hbmR9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxldCBwZWVyID0gdGhpcy5fcGVlckNhY2hlUGF0aChjb21tYW5kLmpzb24ucGVlck5hbWUpXHJcbiAgICAgICAgcmV0dXJuIHtlcnI6RXJyb3JDb2RlLnN1Y2MscmVzcDp7XHJcbiAgICAgICAgICAgIGpzb24gOiB7XHJcbiAgICAgICAgICAgICAgICBjYWNoZV9wYXRoIDogcGVlci5jYWNoZV9wYXRoLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBieXRlcyA6IEJ1ZmZlci5mcm9tKFwiXCIpXHJcbiAgICAgICAgfX1cclxuICAgIH1cclxuICAgIGFzeW5jIGxvYWRBZ2VudENhY2hlKGNvbW1hbmQ6QmR0THBjQ29tbWFuZCk6UHJvbWlzZTxCZHRMcGNSZXNwPntcclxuICAgICAgICBpZiggIWNvbW1hbmQuanNvbi5hZ2VudE5hbWUpe1xyXG4gICAgICAgICAgICB0aGlzLm1fbG9nZ2VyLmVycm9yKGBlcnJvciBjb21tYW5kIDogJHtKU09OLnN0cmluZ2lmeShjb21tYW5kLmpzb24pfWApXHJcbiAgICAgICAgICAgIHJldHVybiB7ZXJyOkVycm9yQ29kZS51bmtub3duQ29tbWFuZH1cclxuICAgICAgICB9XHJcbiAgICAgICAgbGV0IGNhY2hlUGF0aCA9IHBhdGguam9pbih0aGlzLm1fbG9nZ2VyLmRpcigpLGAuLi8uLi8ke2NvbW1hbmQuanNvbi5hZ2VudE5hbWV9YClcclxuICAgICAgICBsZXQgTG9jYWxEZXZpY2VDYWNoZSA9ICBwYXRoLmpvaW4oY2FjaGVQYXRoLFwiTG9jYWxEZXZpY2VcIilcclxuICAgICAgICBsZXQgUmVtb3RlRGV2aWNlQ2FjaGUgPSAgcGF0aC5qb2luKGNhY2hlUGF0aCxcIlJlbW90ZURldmljZVwiKVxyXG4gICAgICAgIGlmKGNvbW1hbmQuanNvbi5pbml0ID09IFwiY2xlYW5cIil7XHJcbiAgICAgICAgICAgIGZzLnJlbW92ZVN5bmMoTG9jYWxEZXZpY2VDYWNoZSk7XHJcbiAgICAgICAgICAgIGZzLnJlbW92ZVN5bmMoUmVtb3RlRGV2aWNlQ2FjaGUpO1xyXG4gICAgICAgICAgICBmcy5yZW1vdmVTeW5jKGNhY2hlUGF0aCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKCFmcy5leGlzdHNTeW5jKGNhY2hlUGF0aCkpe1xyXG4gICAgICAgICAgICBmcy5ta2RpcnBTeW5jKGNhY2hlUGF0aCk7XHJcbiAgICAgICAgICAgIGZzLm1rZGlycFN5bmMoTG9jYWxEZXZpY2VDYWNoZSk7XHJcbiAgICAgICAgICAgIGZzLm1rZGlycFN5bmMoUmVtb3RlRGV2aWNlQ2FjaGUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZighZnMuZXhpc3RzU3luYyhMb2NhbERldmljZUNhY2hlKSl7XHJcbiAgICAgICAgICAgIGZzLm1rZGlycFN5bmMoTG9jYWxEZXZpY2VDYWNoZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKCFmcy5leGlzdHNTeW5jKFJlbW90ZURldmljZUNhY2hlKSl7XHJcbiAgICAgICAgICAgIGZzLm1rZGlycFN5bmMoUmVtb3RlRGV2aWNlQ2FjaGUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBsZXQgbG9jYWxfbGlzdCA9IFtdXHJcbiAgICAgICAgbGV0IHJlbW90ZV9saXN0ID0gW11cclxuICAgICAgICBmb3IobGV0IGRldmljZSBvZiBmcy5yZWFkZGlyU3luYyhMb2NhbERldmljZUNhY2hlKSl7XHJcbiAgICAgICAgICAgIGlmKGRldmljZS5pbmNsdWRlcyhcImRlc2NcIikpe1xyXG4gICAgICAgICAgICAgICAgbG9jYWxfbGlzdC5wdXNoKGRldmljZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgZm9yKGxldCBkZXZpY2Ugb2YgZnMucmVhZGRpclN5bmMoUmVtb3RlRGV2aWNlQ2FjaGUpKXtcclxuICAgICAgICAgICAgcmVtb3RlX2xpc3QucHVzaChkZXZpY2UpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4ge2VycjpFcnJvckNvZGUuc3VjYyxyZXNwOntcclxuICAgICAgICAgICAganNvbiA6IHtcclxuICAgICAgICAgICAgICAgIExvY2FsRGV2aWNlQ2FjaGUsXHJcbiAgICAgICAgICAgICAgICBSZW1vdGVEZXZpY2VDYWNoZSxcclxuICAgICAgICAgICAgICAgIGxvY2FsX2xpc3QsXHJcbiAgICAgICAgICAgICAgICByZW1vdGVfbGlzdCxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgYnl0ZXMgOiBCdWZmZXIuZnJvbShcIlwiKVxyXG4gICAgICAgIH19XHJcbiAgICB9XHJcbiAgICBhc3luYyByZW1vdmVBZ2VudENhY2hlKGNvbW1hbmQ6QmR0THBjQ29tbWFuZCk6UHJvbWlzZTxCZHRMcGNSZXNwPntcclxuICAgICAgICBpZiggIWNvbW1hbmQuanNvbi5hZ2VudE5hbWUpe1xyXG4gICAgICAgICAgICB0aGlzLm1fbG9nZ2VyLmVycm9yKGBlcnJvciBjb21tYW5kIDogJHtKU09OLnN0cmluZ2lmeShjb21tYW5kLmpzb24pfWApXHJcbiAgICAgICAgICAgIHJldHVybiB7ZXJyOkVycm9yQ29kZS51bmtub3duQ29tbWFuZH1cclxuICAgICAgICB9XHJcbiAgICAgICAgbGV0IGNhY2hlUGF0aCA9IHBhdGguam9pbih0aGlzLm1fbG9nZ2VyLmRpcigpLGAuLi8uLi8ke2NvbW1hbmQuanNvbi5hZ2VudE5hbWV9YClcclxuICAgICAgICBsZXQgTG9jYWxEZXZpY2VDYWNoZSA9ICBwYXRoLmpvaW4oY2FjaGVQYXRoLFwiTG9jYWxEZXZpY2VcIilcclxuICAgICAgICBsZXQgUmVtb3RlRGV2aWNlQ2FjaGUgPSAgcGF0aC5qb2luKGNhY2hlUGF0aCxcIlJlbW90ZURldmljZVwiKVxyXG4gICAgICAgIGlmKGNvbW1hbmQuanNvbi50eXBlID09IFwiYWxsXCIpe1xyXG4gICAgICAgICAgICBmcy5yZW1vdmVTeW5jKExvY2FsRGV2aWNlQ2FjaGUpO1xyXG4gICAgICAgICAgICBmcy5yZW1vdmVTeW5jKFJlbW90ZURldmljZUNhY2hlKTtcclxuICAgICAgICAgICAgZnMucmVtb3ZlU3luYyhjYWNoZVBhdGgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZihjb21tYW5kLmpzb24udHlwZSAgPT0gXCJsb2NhbFwiKXtcclxuICAgICAgICAgICAgZnMucmVtb3ZlU3luYyhMb2NhbERldmljZUNhY2hlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYoY29tbWFuZC5qc29uLnR5cGUgID09IFwicmVtb3RlXCIpe1xyXG4gICAgICAgICAgICBmcy5yZW1vdmVTeW5jKFJlbW90ZURldmljZUNhY2hlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHtlcnI6RXJyb3JDb2RlLnN1Y2MscmVzcDp7XHJcbiAgICAgICAgICAgIGpzb24gOiB7XHJcbiAgICAgICAgICAgICAgICBjYWNoZVBhdGgsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGJ5dGVzIDogQnVmZmVyLmZyb20oXCJcIilcclxuICAgICAgICB9fVxyXG4gICAgfVxyXG4gICAgYXN5bmMgY3JlYXRlRGlyKGNvbW1hbmQ6QmR0THBjQ29tbWFuZCk6UHJvbWlzZTxCZHRMcGNSZXNwPntcclxuICAgICAgICBpZiggIWNvbW1hbmQuanNvbi5wZWVyTmFtZXx8ICFjb21tYW5kLmpzb24uZmlsZVNpemUgfHwgIWNvbW1hbmQuanNvbi5kaXJOdW1iZXIgfHwgIWNvbW1hbmQuanNvbi5maWxlTnVtYmVyIHx8ICFjb21tYW5kLmpzb24uZGVlcCl7XHJcbiAgICAgICAgICAgIHRoaXMubV9sb2dnZXIuZXJyb3IoYGVycm9yIGNvbW1hbmQgOiAke0pTT04uc3RyaW5naWZ5KGNvbW1hbmQuanNvbil9YClcclxuICAgICAgICAgICAgcmV0dXJuIHtlcnI6RXJyb3JDb2RlLnVua25vd25Db21tYW5kfVxyXG4gICAgICAgIH1cclxuICAgICAgICBsZXQgcGVlciA9IHRoaXMuX3BlZXJDYWNoZVBhdGgoY29tbWFuZC5qc29uLnBlZXJOYW1lKVxyXG4gICAgICAgIGxldCBkaXJOYW1lID0gUmFuZG9tR2VuZXJhdG9yLnN0cmluZygxMCk7XHJcbiAgICAgICAgbGV0IGRpclBhdGggPSBwYXRoLmpvaW4ocGVlci5jYWNoZV9wYXRoLmZpbGVfdXBsb2FkLGAke2Rpck5hbWV9YClcclxuICAgICAgICAvL+WIm+W7uuaWh+S7tuWkuVxyXG4gICAgICAgIGlmKCFmcy5leGlzdHNTeW5jKHBlZXIuY2FjaGVfcGF0aC5maWxlX3VwbG9hZCkpe1xyXG4gICAgICAgICAgICBhd2FpdCBmcy5ta2RpcnBTeW5jKHBlZXIuY2FjaGVfcGF0aC5maWxlX3VwbG9hZCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGF3YWl0IFJhbmRvbUdlbmVyYXRvci5jcmVhdGVSYW5kb21EaXIoZGlyUGF0aCxjb21tYW5kLmpzb24uZGlyTnVtYmVyLGNvbW1hbmQuanNvbi5maWxlTnVtYmVyLGNvbW1hbmQuanNvbi5maWxlU2l6ZSxjb21tYW5kLmpzb24uZGVlcCk7XHJcbiAgICAgICAgcmV0dXJuIHtlcnI6RXJyb3JDb2RlLnN1Y2MscmVzcDp7XHJcbiAgICAgICAgICAgIGpzb24gOiB7XHJcbiAgICAgICAgICAgICAgICBkaXJOYW1lLFxyXG4gICAgICAgICAgICAgICAgZGlyUGF0aCxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgYnl0ZXMgOiBCdWZmZXIuZnJvbShcIlwiKVxyXG4gICAgICAgIH19XHJcbiAgICB9XHJcbiAgICBhc3luYyBjcmVhdGVQYXRoKGNvbW1hbmQ6QmR0THBjQ29tbWFuZCk6UHJvbWlzZTxCZHRMcGNSZXNwPntcclxuICAgICAgICBpZiggIWNvbW1hbmQuanNvbi5wZWVyTmFtZXx8ICAhY29tbWFuZC5qc29uLmRpck5hbWUpe1xyXG4gICAgICAgICAgICB0aGlzLm1fbG9nZ2VyLmVycm9yKGBlcnJvciBjb21tYW5kIDogJHtKU09OLnN0cmluZ2lmeShjb21tYW5kLmpzb24pfWApXHJcbiAgICAgICAgICAgIHJldHVybiB7ZXJyOkVycm9yQ29kZS51bmtub3duQ29tbWFuZH1cclxuICAgICAgICB9XHJcbiAgICAgICAgbGV0IHBlZXIgPSB0aGlzLl9wZWVyQ2FjaGVQYXRoKGNvbW1hbmQuanNvbi5wZWVyTmFtZSlcclxuICAgICAgICBsZXQgZGlyTmFtZSA9IGNvbW1hbmQuanNvbi5kaXJOYW1lO1xyXG4gICAgICAgIGxldCBkaXJQYXRoID0gcGF0aC5qb2luKHBlZXIuY2FjaGVfcGF0aC5maWxlX2Rvd25sb2FkLGAke2Rpck5hbWV9YClcclxuICAgICAgICAvL+WIm+W7uuaWh+S7tuWkuVxyXG4gICAgICAgIGZzLm1rZGlycFN5bmMoZGlyUGF0aCk7XHJcbiAgICAgICAgcmV0dXJuIHtlcnI6RXJyb3JDb2RlLnN1Y2MscmVzcDp7XHJcbiAgICAgICAgICAgIGpzb24gOiB7XHJcbiAgICAgICAgICAgICAgICBkaXJOYW1lLFxyXG4gICAgICAgICAgICAgICAgZGlyUGF0aCxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgYnl0ZXMgOiBCdWZmZXIuZnJvbShcIlwiKVxyXG4gICAgICAgIH19XHJcbiAgICB9XHJcbiAgICBhc3luYyBtZDUoY29tbWFuZDpCZHRMcGNDb21tYW5kKTpQcm9taXNlPEJkdExwY1Jlc3A+e1xyXG4gICAgICAgIGlmKCFjb21tYW5kLmpzb24uZmlsZVBhdGgpe1xyXG4gICAgICAgICAgICB0aGlzLm1fbG9nZ2VyLmVycm9yKGBlcnJvciBjb21tYW5kIDogJHtKU09OLnN0cmluZ2lmeShjb21tYW5kLmpzb24pfWApXHJcbiAgICAgICAgICAgIHJldHVybiB7ZXJyOkVycm9yQ29kZS51bmtub3duQ29tbWFuZH1cclxuICAgICAgICB9XHJcbiAgICAgICAgbGV0IG1kNSA9IGF3YWl0IHRoaXMuX21kNShjb21tYW5kLmpzb24uZmlsZVBhdGgpO1xyXG4gICAgICAgIHJldHVybiB7ZXJyOkVycm9yQ29kZS5zdWNjLHJlc3A6e1xyXG4gICAgICAgICAgICBqc29uIDoge1xyXG4gICAgICAgICAgICAgICAgbWQ1LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBieXRlcyA6IEJ1ZmZlci5mcm9tKFwiXCIpXHJcbiAgICAgICAgfX1cclxuICAgIH1cclxuICAgIGFzeW5jIGdldElQSW5mbyhjb21tYW5kOkJkdExwY0NvbW1hbmQpOlByb21pc2U8QmR0THBjUmVzcD57XHJcbiAgICAgICAgdmFyIGludGVyZmFjZXMgPSByZXF1aXJlKCdvcycpLm5ldHdvcmtJbnRlcmZhY2VzKCk7XHJcbiAgICAgICAgdGhpcy5tX2xvZ2dlci5pbmZvKGludGVyZmFjZXMpXHJcbiAgICAgICAgdmFyIElQdjRMaXN0OkFycmF5PHN0cmluZz4gPSBbXVxyXG4gICAgICAgIHZhciBJUHY2TGlzdDpBcnJheTxzdHJpbmc+ID0gW11cclxuICAgICAgICBmb3IodmFyIGRldk5hbWUgaW4gaW50ZXJmYWNlcyl7XHJcbiAgICAgICAgICAgIHZhciBpZmFjZSA9IGludGVyZmFjZXNbZGV2TmFtZV07XHJcbiAgICAgICAgICAgIGZvcih2YXIgaT0wO2k8aWZhY2UubGVuZ3RoO2krKyl7XHJcbiAgICAgICAgICAgICAgICB2YXIgYWxpYXMgPSBpZmFjZVtpXTtcclxuICAgICAgICAgICAgICAgIGlmKCBhbGlhcy5mYW1pbHkgPT0gJ0lQdjQnICYmIGFsaWFzLmFkZHJlc3MgIT09ICcxMjcuMC4wLjEnICl7IC8vJiYgIWFsaWFzLmludGVybmFsXHJcbiAgICAgICAgICAgICAgICAgICAgSVB2NExpc3QucHVzaChhbGlhcy5hZGRyZXNzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmKCBhbGlhcy5mYW1pbHkgPT0gJ0lQdjYnICYmIGFsaWFzLmFkZHJlc3MgIT09ICcxMjcuMC4wLjEnICl7IC8vJiYgIWFsaWFzLmludGVybmFsXHJcbiAgICAgICAgICAgICAgICAgICAgSVB2Nkxpc3QucHVzaChhbGlhcy5hZGRyZXNzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4ge2VycjpFcnJvckNvZGUuc3VjYyxyZXNwOntcclxuICAgICAgICAgICAganNvbiA6IHtcclxuICAgICAgICAgICAgICAgIGlwSW5mbzp7SVB2NDpJUHY0TGlzdCxJUHY2OklQdjZMaXN0fVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBieXRlcyA6IEJ1ZmZlci5mcm9tKFwiXCIpXHJcbiAgICAgICAgfX1cclxuICAgIH1cclxuICAgIGFzeW5jIHVwbG9hZExvZyhjb21tYW5kOkJkdExwY0NvbW1hbmQpOlByb21pc2U8QmR0THBjUmVzcD57XHJcbiAgICAgICAgdGhpcy5tX2xvZ2dlci5pbmZvKGBjb21tYW5kIDogJHtKU09OLnN0cmluZ2lmeShjb21tYW5kLmpzb24pfWApXHJcbiAgICAgICAgaWYoIWNvbW1hbmQuanNvbi5sb2dOYW1lKXtcclxuICAgICAgICAgICAgdGhpcy5tX2xvZ2dlci5lcnJvcihgZXJyb3IgY29tbWFuZCA6ICR7SlNPTi5zdHJpbmdpZnkoY29tbWFuZC5qc29uKX1gKVxyXG4gICAgICAgICAgICByZXR1cm4ge2VycjpFcnJvckNvZGUudW5rbm93bkNvbW1hbmR9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIGxldCB6aXAgPSBhd2FpdCB0aGlzLm1faW50ZXJmYWNlLnppcCh0aGlzLm1faW50ZXJmYWNlLmdldExvZ2dlcigpLmRpcigpLGNvbW1hbmQuanNvbi5sb2dOYW1lKVxyXG4gICAgICAgIGxldCB1cGxvYWQgPSBhd2FpdCB0aGlzLm1faW50ZXJmYWNlLnVwbG9hZEZpbGUoemlwLmRzdFBhdGghLFwibG9nc1wiKTtcclxuICAgICAgICB0aGlzLm1fbG9nZ2VyLmluZm8oYHVwbG9hZCBsb2cgdG8gc2VydmVyICxyZXN1bHQgPSAke0pTT04uc3RyaW5naWZ5KHVwbG9hZCl9YClcclxuICAgICAgICByZXR1cm4ge2VycjpFcnJvckNvZGUuc3VjYyxyZXNwOntcclxuICAgICAgICAgICAganNvbiA6IHtcclxuICAgICAgICAgICAgICAgIHVwbG9hZCxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgYnl0ZXMgOiBCdWZmZXIuZnJvbShcIlwiKVxyXG4gICAgICAgIH19XHJcbiAgICB9XHJcbiAgICBhc3luYyB1cGxvYWRDYWNoZUZpbGUoY29tbWFuZDpCZHRMcGNDb21tYW5kKTpQcm9taXNlPEJkdExwY1Jlc3A+e1xyXG4gICAgICAgIGlmKCFjb21tYW5kLmpzb24ucGF0aCB8fCAhY29tbWFuZC5qc29uLmxvZ05hbWUpe1xyXG4gICAgICAgICAgICB0aGlzLm1fbG9nZ2VyLmVycm9yKGBlcnJvciBjb21tYW5kIDogJHtKU09OLnN0cmluZ2lmeShjb21tYW5kLmpzb24pfWApXHJcbiAgICAgICAgICAgIHJldHVybiB7ZXJyOkVycm9yQ29kZS51bmtub3duQ29tbWFuZH1cclxuICAgICAgICB9XHJcbiAgICAgICAgbGV0IHppcCA9IGF3YWl0IHRoaXMubV9pbnRlcmZhY2UuemlwKGNvbW1hbmQuanNvbi5wYXRoLGNvbW1hbmQuanNvbi5sb2dOYW1lKVxyXG4gICAgICAgIGxldCB1cGxvYWQgPSBhd2FpdCB0aGlzLm1faW50ZXJmYWNlLnVwbG9hZEZpbGUoemlwLmRzdFBhdGghLFwibG9nc1wiKTtcclxuICAgICAgICByZXR1cm4ge2VycjpFcnJvckNvZGUuc3VjYyxyZXNwOntcclxuICAgICAgICAgICAganNvbiA6IHtcclxuICAgICAgICAgICAgICAgIHVwbG9hZCxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgYnl0ZXMgOiBCdWZmZXIuZnJvbShcIlwiKVxyXG4gICAgICAgIH19XHJcbiAgICB9XHJcbn1cclxuIl19
