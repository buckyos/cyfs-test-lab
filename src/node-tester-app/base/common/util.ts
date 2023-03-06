import {ErrorCode} from './errcode';
import * as process from 'process';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as util from 'util';
import * as Http from 'http';
import * as Https from 'https';
import * as Crypto from 'crypto';
import { BufferWriter } from './writer';
import * as SysUtil from 'util';
import * as os from 'os';
import * as net from 'net';

export class DirHelper {
    public static m_rootDir: string = '';
    static  getTaskDir(task: string): string {
        let dir: string = path.join(DirHelper.getRootDir(), 'tasks');
        DirHelper.ensureDirExist(dir);
        dir = path.join(dir, task);
        DirHelper.ensureDirExist(dir);
        return dir;
    }
    static  getTestcaseDir(testcase: string): string {
        let dir: string = path.join(DirHelper.getRootDir(), 'testcase');
        DirHelper.ensureDirExist(dir);
        dir = path.join(dir, testcase);
        DirHelper.ensureDirExist(dir);
        return dir;
    }

    static getServiceDir(service: string): string {
        let dir: string = path.join(DirHelper.getRootDir(), 'service');
        DirHelper.ensureDirExist(dir);
        dir = path.join(dir, service);
        DirHelper.ensureDirExist(dir);
        return dir;
    }

    static getUpdateDir(): string {
        let dir: string = path.join(DirHelper.getRootDir(), 'update');
        DirHelper.ensureDirExist(dir);
        return dir;
    }

    static getConfigDir(): string {
        let dir: string = path.join(DirHelper.getRootDir(), 'config');
        DirHelper.ensureDirExist(dir);
        return dir;
    }

    static getLogDir(folder?: string): string {
        let dir: string = path.join(DirHelper.getRootDir(), 'blog');
        if (folder) {
            dir = path.join(dir, folder);
        }
        DirHelper.ensureDirExist(dir);
        return dir;
    }

    static getTempDir(): string {
        let dir: string = path.join(DirHelper.getRootDir(), 'temp');
        DirHelper.ensureDirExist(dir);
        return dir;
    }

    static emptyDir(dir: string, removeDir?: boolean) {
        try {
            if (fs.existsSync(dir)) {
                fs.emptyDirSync(dir);
                if (removeDir) {
                    fs.rmdirSync(dir);
                }
            }
        } catch(err) {

        }
    }

    static ensureDirExist(dir: string) {
        if (fs.existsSync(dir)) {
            return;
        }

        fs.mkdirSync(dir);
    }

    static getRootDir(): string {
        return DirHelper.m_rootDir;
    }
    static setRootDir(d: string) {
        DirHelper.m_rootDir = d;
    }

    static async clearExpired(filePath: string, validDay: number) {
        let lstat = SysUtil.promisify(fs.lstat);
        let readDir = SysUtil.promisify(fs.readdir);
        let unlink = SysUtil.promisify(fs.unlink);

        let expireMs: number = validDay * 24 * 3600 * 1000;
        let doClear = async (dst: string) => {
            let stat: fs.Stats = await lstat(dst) as fs.Stats;
            if (stat.isFile()) {
                if ((Date.now() - stat.atimeMs > expireMs) || (Date.now() - stat.mtimeMs > expireMs)) {
                    await unlink(dst);
                }
            } else {
                let files = await readDir(dst) as string[];
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
        } catch(err) {

        }
    }
}

export class VersionHelper {
    static compare(v1: string, v2: string): number {
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

export async function sleep(time: number) {
    await new Promise((v) => {
        setTimeout(() => {
            v("");
        }, time);
    });
}

export function getFileMd5(filePath: string): {err: ErrorCode, md5?: string} {
    try {
        let fileContent: Buffer = fs.readFileSync(filePath);
        let md5 = Crypto.createHash('md5');
        md5.update(fileContent);
        let md5Hash = md5.digest();
        return {err: ErrorCode.succ, md5: md5Hash.toString('hex')};
    } catch (e) {
        console.log(`[util] get file md5 exception, err=${e}`);
        return {err: ErrorCode.exception};
    }
}

export class HttpDownloader {
    static async downloadByUrl(url: string, filePath: string, md5: string): Promise<ErrorCode> {
        let httpX: any = Http;
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
        return await new Promise<ErrorCode>((v) => {
            let request: Http.ClientRequest = httpX.request(url, (resp: Http.IncomingMessage) => {
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
                            return ;
                        }
                        if (md5Info.md5! !== md5) {
                            v(ErrorCode.md5NotMatch);
                            return ;
                        }
                        v(ErrorCode.succ);
                    });
                    resp.once('error', (error) => {
                        fs.closeSync(fd);
                        console.log(`[util] down file failed, err=${error}, url=${url}`);
                        v(ErrorCode.netError);
                    });
                } else {
                    console.log(`[util] down file failed, resp statuscode not equal 200, url=${url}`);
                    v(ErrorCode.netError);
                }
            });
            request.once('error', (err) => {
                console.log(`[util] down file failed, request failed, err=${err}, url=${url}`);
                v(ErrorCode.fail);
            });
            request.end();
        });
    }

    // packageAddress: { schema, host, port, path: `/${requestPath}` }
    static download(packageAddress: any, filePath: any, fileMD5?: any) {
        console.log(`download: url:${packageAddress}, filePath:${filePath}, md5:${fileMD5}`);
        return new Promise<any>(async (resolve) => {
            if (fs.existsSync(filePath)) {
                try {
                    const readFile = util.promisify(fs.readFile);
                    let fileContent: any = await readFile(filePath);
                    let md5 = Crypto.createHash('md5');
                    md5.update(fileContent);
                    let md5Hash = md5.digest();
                    if (fileMD5 && md5Hash.toString('hex') === fileMD5) {
                        console.log(`download finish: url:${packageAddress}, filePath:${filePath}, md5:${fileMD5}, found local`);
                        resolve(filePath);
                        return;
                    } else {
                        // 新建方式打开就好了，尽量少IO，省得各种不明原因出错
                        // fs.unlinkSync(filePath);
                    }
                } catch (err) {
                    // fs.unlinkSync(filePath);
                }
            }

            const schema = packageAddress.schema || 'http';
            const port = packageAddress.port || (schema === 'https' ? 443 : 80);
            let httpX: any = (schema === 'https' ? Https : Http);
            const request = httpX.request(({host: packageAddress.host, port, path: packageAddress.path} as Http.RequestOptions), (resp: Http.IncomingMessage) => {
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
                } else {
                    console.log(`download failed(${resp.statusCode}): url:${packageAddress}, filePath:${filePath}, md5:${fileMD5}, found local`);
                    resolve(null);
                }
            });
    
            request.once('error', (err: any) => {
                console.log(`download failed(${JSON.stringify(err)}): url:${packageAddress}, filePath:${filePath}, md5:${fileMD5}, found local`);
                resolve(null);
            });
            request.end();
        });
    }
}

export class RandomGenerator {
    // 默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1
    static CHAR_SET:string = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';

    static  string(length: number = 32) {
        let maxPos = RandomGenerator.CHAR_SET.length;
        let result = '';
        for (let i = 0; i < length; i++) {
            result += RandomGenerator.CHAR_SET.charAt(RandomGenerator.integer(maxPos));
        }
        if(Buffer.byteLength(result)<length){
            let accurate_len = length - Buffer.byteLength(result);
            result += RandomGenerator.accurateString(accurate_len);
        }
        return result;
    };
    
    static accurateString(length: number = 32){
        let maxPos = RandomGenerator.CHAR_SET.length;
        let result = '';
        for (let i = 0; i < length; i++) {
            result += RandomGenerator.CHAR_SET.charAt(RandomGenerator.integer(maxPos));
        }
        while(Buffer.byteLength(result)<length){
            result += RandomGenerator.CHAR_SET.charAt(RandomGenerator.integer(maxPos));
        }
        return result;
    }

    static integer(max: number, min: number = 0) {
        let result = Math.round(Math.random() * (max - min)) + min;
        if (result > max) {
            result = max;
        }
        return result;
    }
};

export class FormatDateHelper {
    static now(fmt: string): string {
        let now = new Date();
        let o: any = {
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

export class NetHelper {
    static getLocalIPs(withInternal: boolean) {
        let ips: string[] = [];
        let netInterface = os.networkInterfaces();
        for (let name of Object.keys(netInterface)) {
            if (name.indexOf('VMware') !== -1) {
                continue;
            }
            netInterface![name]!.forEach((info) => {
                if ((info.address !== '127.0.0.1') && (info.address !== '::1') && (withInternal || !info.internal)) {
                    if (info.family === 'IPv4') {
                        let el = info.address.split('.');
                        // 去掉0.x.x.x和169.254.x.x
                        if (el.length !== 4 ||
                            parseInt(el[0]) === 0 ||
                            (parseInt(el[0]) === 169 && parseInt(el[1]) === 254)) {
                            return;
                        }
                    } else if (info.family === 'IPv6') {
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

    static getLocalIPV4(withInternal: boolean) {
        return NetHelper.getLocalIPs(withInternal).filter(ip => net.isIPv4(ip))
    }
}