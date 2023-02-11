import * as path from 'path';
import * as fs from 'fs-extra';
import {AccountStatusProfile} from './account_profile';
import * as ChildProcess from 'child_process';
import * as compressing from 'compressing';
import * as os from 'os';
import { Reporter, DirHelper, getFileMd5, HttpDownloader, VersionHelper, FileUploader, GlobalConfig, RandomGenerator, sleep, ErrorCode, LocalStorageJson, Logger } from '../base';
const Base = require('../base/common/base.js');
const Http = require('http');

const SUPPORT_QQ_ADDRESS = '（官方QQ群:777179682）';
const TIME_WHEN_NET_ERROR: number = 30 * 1000;
const TIME_WHEN_SUCC: number = 2 * 60 * 1000;

type RunnerOptions = {
    account: AccountStatusProfile;
    reporter: Reporter;
    version: string;
    updateHost: string;
    updatePort: number;
    deviceIdSave: LocalStorageJson;
    platform: string;
}

class Runner {
    private m_account: AccountStatusProfile;
    private m_reporter: Reporter;
    private m_version: string;
    protected m_process?: ChildProcess.ChildProcess;
    protected m_sendMsgTimer?: NodeJS.Timer;
    protected m_latestRecvTime: number = 0;
    protected m_updateHost: string;
    protected m_updatePort: number;
    protected m_deviceIdSave: LocalStorageJson;
    protected m_platform: string;
    protected m_downinfo: Set<string> = new Set();
    
    constructor(options: RunnerOptions) {
        this.m_account = options.account;
        this.m_reporter = options.reporter;
        this.m_version = options.version;
        this.m_updateHost = options.updateHost;
        this.m_updatePort = options.updatePort;
        this.m_deviceIdSave = options.deviceIdSave;
        this.m_platform = options.platform;
    }

    async start() {
        await this.m_deviceIdSave.load();
        while(true) {
            this._updateImpl();
            await new Promise((resolve) => {
                setTimeout(() => {
                    resolve(0);
                }, TIME_WHEN_SUCC);
            });
        }
    }

    async getDeviceID(): Promise<string> {
        let id: string = '';
        let info = await this.m_deviceIdSave.get('deviceId');
        if (info.err || !info.value || !info.value!.length) {
            if (this.m_account.deviceID && this.m_account.deviceID.length) {
                id = this.m_account.deviceID;
            } else if (this.m_account.peerid && this.m_account.peerid.length) {
                id = this.m_account.peerid;
            } else {
                id = RandomGenerator.string(32);
            }

            if (id.length) {
                await this.m_deviceIdSave.set('deviceId', id);
            }
        } else {
            id = info.value!;
        }

        return id;
    }

    private async _httpGet(param: any): Promise<{err: ErrorCode, content?: any}> {
        return await new Promise<{err: ErrorCode, content?: any}>((resolve: any) => {
            let respBuffer = Buffer.allocUnsafe(Buffer.poolSize);
            let recvSize = 0;
            const request = Http.request({host: this.m_updateHost, port: this.m_updatePort, path: '/system/query/', method: 'POST'}, (resp: any) => {
                
                if (resp.statusCode === 200) {
                    resp.setTimeout(10000);
                    resp.on('data', (chunk: any) => {
                        if (recvSize + chunk.length > respBuffer.length) {
                            let newBuffer = Buffer.allocUnsafe((recvSize + chunk.length + Buffer.poolSize - 1) / Buffer.poolSize * Buffer.poolSize);
                            respBuffer.copy(newBuffer);
                            respBuffer = newBuffer;
                        }
                        chunk.copy(respBuffer, recvSize);
                        recvSize += chunk.length;
                    });
                    resp.once('end', () => {
                        try {
                            let content = JSON.parse(respBuffer.slice(0, recvSize).toString());
                            resolve({ErrorCode: ErrorCode.succ, content});
                        } catch (err) {
                            resolve({ErrorCode: ErrorCode.exception});
                        }
                    });
                    resp.once('error', () => {
                        resolve({ErrorCode: ErrorCode.fail});
                    });
                    resp.once('timeout', () => {
                        resolve({ErrorCode: ErrorCode.timeout});
                    });
                } else {
                    resolve({ErrorCode: ErrorCode.fail});
                }
            });
    
            request.once('error', (err: any) => {
                resolve({ErrorCode: ErrorCode.fail});
            });

            request.setTimeout(10000);
            request.once('timeout', () => {
                resolve({ErrorCode: ErrorCode.timeout});
            });

            request.setHeader('Content-Type', 'application/json');
            request.write(JSON.stringify(param));
            request.end();
        });
    }

    private async _updateImpl() {
        await this._update();
        await this._startLocalMaster();
    }

    private async _update(): Promise<number> {
        do {
            let deviceID = await this.getDeviceID();
            let resp: any = await this.m_reporter!.report('update', { sessionID: this.m_account.sessionID, deviceID, platform: os.platform() });
            if (!resp || !resp.content) {
                break;
            }

            Base.blog.debug(`updated command: ${JSON.stringify(resp)}`);

            let profit = resp.content.profit;
            if (resp.content.errorMsg && resp.content.errorMsg.length > 0) {
                this.m_account.errorMsg = resp.content.errorMsg;
                await this.m_account.save();
                break;
            }

            this.m_account.errorMsg = '正常' + SUPPORT_QQ_ADDRESS;
            this.m_account.totalProfit = profit.totalProfit;
            this.m_account.todayProfit = profit.todayProfit;
            this.m_account.wallet = profit.gctAddress;
            this.m_account.walletType = 1;
            await this.m_account.save();
        } while(false);

        let deviceID = await this.getDeviceID();
        let resp = await this._httpGet({
            agentid: deviceID,
            curversion: this.m_version,
        });

        Base.blog.debug(`updated command: ${JSON.stringify(resp)} agentid=${deviceID}, currversion=${this.m_version}`);
        if (resp.err) {
            return TIME_WHEN_NET_ERROR;
        }

        if (!resp.content || !resp.content!.md5 || !resp.content!.url || !resp.content!.newversion) {
            return TIME_WHEN_SUCC;
        }

        if (VersionHelper.compare(this.m_version, resp.content!.newversion) >= 0) {
            return TIME_WHEN_SUCC;
        }

        //正在下载
        if (this.m_downinfo.has(resp.content!.md5)) {
            return TIME_WHEN_SUCC;
        }
        this.m_downinfo.add(resp.content!.md5);

        //下载
        let filePath: string = path.join(DirHelper.getTempDir(), `${resp.content!.md5}.zip`);
        let err = await HttpDownloader.downloadByUrl(resp.content!.url, filePath, resp.content!.md5);
        this.m_downinfo.delete(resp.content!.md5);
        if (err) {
            return TIME_WHEN_SUCC;
        }

        if (fs.existsSync(filePath)) {
            await this._stopLocalMaster();

            let result  = await compressing.zip.uncompress(filePath, DirHelper.getRootDir());
            Base.blog.info(`compressing zip result = ${result}`);
            process.exit(0);
        }

        return TIME_WHEN_SUCC;
    }

    private async _startLocalMaster() {
        if (this.m_process) {
            return ;
        }

        let entryfile: string = path.join(path.dirname((require.main as any).filename), './master_main.js');
        let deviceID: string = await this.getDeviceID();
        this.m_process = ChildProcess.fork(entryfile, [DirHelper.getRootDir(), deviceID, this.m_platform], { silent: true });
        this.m_process.on('exit', (code: number, signal: string) => {
            if (this.m_sendMsgTimer) {
                clearInterval(this.m_sendMsgTimer);
                this.m_sendMsgTimer = undefined;
            }
            
            Base.blog.debug(`[startup] service exit, code=${code}, signal=${signal}`);
            this.m_process = undefined;

            process.exit(0);
        });

        this.m_latestRecvTime = Date.now();
        this.m_sendMsgTimer = setInterval(() => {
            this.m_process!.send('keeplive');
            if (Date.now() - this.m_latestRecvTime > 30 * 1000) {
                Base.blog.debug('chaild not exist ==================');
                process.exit(0);
            }
        }, 2000);

        this.m_process!.stdout!.on('data', (data) => {
            this.m_latestRecvTime = Date.now();
        });
    }

    protected async _stopLocalMaster() {
        Base.blog.debug('stop local master');
        if (!this.m_process) {
            return;
        }

        if (this.m_sendMsgTimer) {
            clearInterval(this.m_sendMsgTimer);
            this.m_sendMsgTimer = undefined;
        }

        await new Promise((v) => {
            this.m_process!.once('exit', () => {
                v("");
            });

           // this.m_process!.stdout.removeAllListeners();
            this.m_process!.kill();
        });
    }
}

async function main() {
    process.chdir(path.dirname((require.main as any).filename));
    let dir = path.dirname(path.dirname((require.main as any).filename));
    console.log(`${dir}`);

    DirHelper.setRootDir(dir);
    let logFolder = DirHelper.getLogDir();
    DirHelper.emptyDir(logFolder);
    DirHelper.emptyDir(DirHelper.getTempDir());
    setInterval(() => {
        DirHelper.clearExpired(DirHelper.getTempDir(), 7);
        DirHelper.clearExpired(DirHelper.getLogDir(), 7);
        DirHelper.clearExpired(DirHelper.getUpdateDir(), 60);
    }, 24 * 3600 * 1000);

    Base.BX_SetLogLevel(Base.BLOG_LEVEL_INFO);
    Base.BX_EnableFileLog(logFolder, `${path.basename((require.main as any).filename, '.js')}`, '.log');
    Base.blog.enableConsoleTarget(false);
    Base.blog.info(`current dir=${process.cwd()}, rootdir=${DirHelper.getRootDir()}`);

    FileUploader.getInstance().init(GlobalConfig.fileUploadServer.host, GlobalConfig.fileUploadServer.port);
    process.on('unhandledRejection', async (err, promise) => {
        Base.blog.error(`unhandledRejection e=${err}`);
        promise.catch((err1) => {
            Base.blog.error(`unhandledRejection promise err=${err1}`);
        });
        sleep(2000);
        process.exit(0);
    });
    process.on('uncaughtException', async (err) => {
        Base.blog.error(`uncaughtException e=${err},  at ${err.stack}`);
        sleep(2000);
        process.exit(0);
    });

    let account: AccountStatusProfile = new AccountStatusProfile();
    await account.load();
    if (!account.accountID || account.accountID.length === 0) {
        account.accountID = process.argv[2];
    }
    if (!account.peerid || account.peerid.length === 0) {
        account.peerid = `${account.accountID}-${RandomGenerator.string(8)}`;
    }
    account.errorMsg = '正在连接服务器';
    await account.save();

    let reporter = new Reporter(GlobalConfig.reportServer.host, GlobalConfig.reportServer.port, account.peerid, GlobalConfig.version);

    let logger: Logger = new Logger(Base.blog.info, Base.blog.debug, Base.blog.error, logFolder);
    let deviceIdSave = new LocalStorageJson({
        file: path.join(DirHelper.getConfigDir(), 'deviceId.json'),
        logger
    });
    let platform: string = os.platform();
    if (process.argv[3]) {
        platform = process.argv[3];
    }
    let runner: Runner = new Runner({
        account,
        reporter,
        version: GlobalConfig.version,
        updateHost: GlobalConfig.updateServer.host,
        updatePort: GlobalConfig.updateServer.port,
        deviceIdSave,
        platform
    });
    await runner.start();
}

main();