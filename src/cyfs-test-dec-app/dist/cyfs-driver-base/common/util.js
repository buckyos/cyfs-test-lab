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
exports.NetHelper = exports.FormatDateHelper = exports.HttpDownloader = exports.getFileMd5 = exports.sleep = exports.VersionHelper = exports.DirHelper = void 0;
const errcode_1 = require("./errcode");
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const util = __importStar(require("util"));
const Http = __importStar(require("http"));
const Https = __importStar(require("https"));
const Crypto = __importStar(require("crypto"));
const SysUtil = __importStar(require("util"));
const os = __importStar(require("os"));
const net = __importStar(require("net"));
class DirHelper {
    static getTaskDir(task) {
        let dir = path.join(DirHelper.getRootDir(), 'tasks');
        DirHelper.ensureDirExist(dir);
        dir = path.join(dir, task);
        DirHelper.ensureDirExist(dir);
        return dir;
    }
    static getServiceDir(service) {
        let dir = path.join(DirHelper.getRootDir(), 'service');
        DirHelper.ensureDirExist(dir);
        dir = path.join(dir, service);
        DirHelper.ensureDirExist(dir);
        return dir;
    }
    static getUpdateDir() {
        let dir = path.join(DirHelper.getRootDir(), 'update');
        DirHelper.ensureDirExist(dir);
        return dir;
    }
    static getConfigDir() {
        let dir = path.join(DirHelper.getRootDir(), 'config');
        DirHelper.ensureDirExist(dir);
        return dir;
    }
    static getLogDir(folder) {
        let dir = path.join(DirHelper.getRootDir(), 'blog');
        if (folder) {
            dir = path.join(dir, folder);
        }
        DirHelper.ensureDirExist(dir);
        return dir;
    }
    static getTempDir() {
        let dir = path.join(DirHelper.getRootDir(), 'temp');
        DirHelper.ensureDirExist(dir);
        return dir;
    }
    static emptyDir(dir, removeDir) {
        try {
            if (fs.existsSync(dir)) {
                fs.emptyDirSync(dir);
                if (removeDir) {
                    fs.rmdirSync(dir);
                }
            }
        }
        catch (err) {
        }
    }
    static ensureDirExist(dir) {
        if (fs.existsSync(dir)) {
            return;
        }
        fs.mkdirSync(dir);
    }
    static getRootDir() {
        return DirHelper.m_rootDir;
    }
    static setRootDir(d) {
        DirHelper.m_rootDir = d;
    }
    static async clearExpired(filePath, validDay) {
        let lstat = SysUtil.promisify(fs.lstat);
        let readDir = SysUtil.promisify(fs.readdir);
        let unlink = SysUtil.promisify(fs.unlink);
        let expireMs = validDay * 24 * 3600 * 1000;
        let doClear = async (dst) => {
            let stat = await lstat(dst);
            if (stat.isFile()) {
                if ((Date.now() - stat.atimeMs > expireMs) || (Date.now() - stat.mtimeMs > expireMs)) {
                    await unlink(dst);
                }
            }
            else {
                let files = await readDir(dst);
                for (let f of files) {
                    doClear(path.join(dst, f));
                }
                if (filePath !== dst) {
                    fs.rmdirSync(dst);
                }
            }
        };
        try {
            await doClear(filePath);
        }
        catch (err) {
        }
    }
}
exports.DirHelper = DirHelper;
DirHelper.m_rootDir = '';
class VersionHelper {
    static compare(v1, v2) {
        let vl1 = v1.split('.');
        let vl2 = v2.split('.');
        let i = 0;
        for (; i < vl1.length; i++) {
            if (i >= vl2.length) {
                return 1;
            }
            let sub = parseInt(vl1[i]) - parseInt(vl2[i]);
            if (sub !== 0) {
                return sub;
            }
        }
        if (i < vl2.length) {
            return -1;
        }
        return 0;
    }
}
exports.VersionHelper = VersionHelper;
async function sleep(time) {
    await new Promise((v) => {
        setTimeout(() => {
            v("");
        }, time);
    });
}
exports.sleep = sleep;
function getFileMd5(filePath) {
    try {
        let fileContent = fs.readFileSync(filePath);
        let md5 = Crypto.createHash('md5');
        md5.update(fileContent);
        let md5Hash = md5.digest();
        return { err: errcode_1.ErrorCode.succ, md5: md5Hash.toString('hex') };
    }
    catch (e) {
        console.log(`[util] get file md5 exception, err=${e}`);
        return { err: errcode_1.ErrorCode.exception };
    }
}
exports.getFileMd5 = getFileMd5;
class HttpDownloader {
    static async downloadByUrl(url, filePath, md5) {
        let httpX = Http;
        if (url.indexOf(':') > 0) {
            let parts = url.split(':');
            if (parts[0].toLocaleLowerCase() === 'https') {
                httpX = Https;
            }
        }
        // Http.request()
        // function request(url: string | URL, options: RequestOptions, callback?: (res: IncomingMessage) => void): ClientRequest;
        // Https.request()
        // function request(url: string | URL, options: RequestOptions, callback?: (res: http.IncomingMessage) => void): http.ClientRequest;
        return await new Promise((v) => {
            let request = httpX.request(url, (resp) => {
                if (resp.statusCode === 200) {
                    let fd = fs.openSync(filePath, 'w');
                    resp.on('data', (chunk) => {
                        fs.writeSync(fd, chunk);
                    });
                    resp.once('end', () => {
                        fs.closeSync(fd);
                        let md5Info = getFileMd5(filePath);
                        if (md5Info.err) {
                            v(md5Info.err);
                            return;
                        }
                        if (md5Info.md5 !== md5) {
                            v(errcode_1.ErrorCode.md5NotMatch);
                            return;
                        }
                        v(errcode_1.ErrorCode.succ);
                    });
                    resp.once('error', (error) => {
                        fs.closeSync(fd);
                        console.log(`[util] down file failed, err=${error}, url=${url}`);
                        v(errcode_1.ErrorCode.netError);
                    });
                }
                else {
                    console.log(`[util] down file failed, resp statuscode not equal 200, url=${url}`);
                    v(errcode_1.ErrorCode.netError);
                }
            });
            request.once('error', (err) => {
                console.log(`[util] down file failed, request failed, err=${err}, url=${url}`);
                v(errcode_1.ErrorCode.fail);
            });
            request.end();
        });
    }
    // packageAddress: { schema, host, port, path: `/${requestPath}` }
    static download(packageAddress, filePath, fileMD5) {
        console.log(`download: url:${packageAddress}, filePath:${filePath}, md5:${fileMD5}`);
        return new Promise(async (resolve) => {
            if (fs.existsSync(filePath)) {
                try {
                    const readFile = util.promisify(fs.readFile);
                    let fileContent = await readFile(filePath);
                    let md5 = Crypto.createHash('md5');
                    md5.update(fileContent);
                    let md5Hash = md5.digest();
                    if (fileMD5 && md5Hash.toString('hex') === fileMD5) {
                        console.log(`download finish: url:${packageAddress}, filePath:${filePath}, md5:${fileMD5}, found local`);
                        resolve(filePath);
                        return;
                    }
                    else {
                        // 新建方式打开就好了，尽量少IO，省得各种不明原因出错
                        // fs.unlinkSync(filePath);
                    }
                }
                catch (err) {
                    // fs.unlinkSync(filePath);
                }
            }
            const schema = packageAddress.schema || 'http';
            const port = packageAddress.port || (schema === 'https' ? 443 : 80);
            let httpX = (schema === 'https' ? Https : Http);
            const request = httpX.request({ host: packageAddress.host, port, path: packageAddress.path }, (resp) => {
                if (resp.statusCode === 200) {
                    let fd = fs.openSync(filePath, 'w');
                    resp.on('data', (chunk) => {
                        fs.writeSync(fd, chunk);
                    });
                    resp.once('end', () => {
                        fs.closeSync(fd);
                        console.log(`download finish: url:${packageAddress}, filePath:${filePath}, md5:${fileMD5}, from network`);
                        resolve(filePath);
                    });
                    resp.once('error', () => {
                        fs.closeSync(fd);
                        // fs.unlink(filePath);
                        console.log(`download failed: url:${packageAddress}, filePath:${filePath}, md5:${fileMD5}, found local`);
                        resolve(null);
                    });
                }
                else {
                    console.log(`download failed(${resp.statusCode}): url:${packageAddress}, filePath:${filePath}, md5:${fileMD5}, found local`);
                    resolve(null);
                }
            });
            request.once('error', (err) => {
                console.log(`download failed(${JSON.stringify(err)}): url:${packageAddress}, filePath:${filePath}, md5:${fileMD5}, found local`);
                resolve(null);
            });
            request.end();
        });
    }
}
exports.HttpDownloader = HttpDownloader;
class FormatDateHelper {
    static now(fmt) {
        let now = new Date();
        let o = {
            'M+': now.getMonth() + 1,
            'd+': now.getDate(),
            'H+': now.getHours(),
            'm+': now.getMinutes(),
            's+': now.getSeconds(),
            'S+': now.getMilliseconds()
        };
        //因为date.getFullYear()出来的结果是number类型的,所以为了让结果变成字符串型，下面有两种方法：
        if (/(y+)/.test(fmt)) {
            //第一种：利用字符串连接符“+”给date.getFullYear()+''，加一个空字符串便可以将number类型转换成字符串。
            fmt = fmt.replace(RegExp.$1, (now.getFullYear() + '').substr(4 - RegExp.$1.length));
        }
        for (var k in o) {
            if (new RegExp('(' + k + ')').test(fmt)) {
                //第二种：使用String()类型进行强制数据类型转换String(date.getFullYear())，这种更容易理解。
                fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (('00' + o[k]).substr(String(o[k]).length)));
            }
        }
        return fmt;
    }
}
exports.FormatDateHelper = FormatDateHelper;
class NetHelper {
    static getLocalIPs(withInternal) {
        let ips = [];
        let netInterface = os.networkInterfaces();
        for (let name of Object.keys(netInterface)) {
            if (name.indexOf('VMware') !== -1) {
                continue;
            }
            netInterface[name].forEach((info) => {
                if ((info.address !== '127.0.0.1') && (info.address !== '::1') && (withInternal || !info.internal)) {
                    if (info.family === 'IPv4') {
                        let el = info.address.split('.');
                        // 去掉0.x.x.x和169.254.x.x
                        if (el.length !== 4 ||
                            parseInt(el[0]) === 0 ||
                            (parseInt(el[0]) === 169 && parseInt(el[1]) === 254)) {
                            return;
                        }
                    }
                    else if (info.family === 'IPv6') {
                        let el = info.address.split(':');
                        if (el.length === 0 ||
                            parseInt(el[0], 16) === 0xfe80) {
                            return;
                        }
                    }
                    ips.push(info.address);
                }
            });
        }
        return ips;
    }
    static getLocalIPV4(withInternal) {
        return NetHelper.getLocalIPs(withInternal).filter(ip => net.isIPv4(ip));
    }
}
exports.NetHelper = NetHelper;
