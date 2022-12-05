import * as path from 'path';
import {AccountStatusProfile} from '../script/account_profile';
import * as ChildProcess from 'child_process';
import { Reporter, DirHelper, FileUploader, GlobalConfig, RandomGenerator, LocalStorageJson, Logger, } from '../base';
import * as readline from 'readline';
import * as os from 'os';

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
    
    constructor(options: RunnerOptions) {
        this.m_account = options.account;
        this.m_reporter = options.reporter;
        this.m_version = options.version;
        this.m_updateHost = options.updateHost;
        this.m_updatePort = options.updatePort;
        this.m_deviceIdSave = options.deviceIdSave;
        this.m_platform = options.platform;
    }

    get process(): ChildProcess.ChildProcess {
        return this.m_process!;
    }

    async getDeviceID(): Promise<string> {
        let id: string = '';
        let info = await this.m_deviceIdSave.get('deviceId');
        if (info.err || !info.value || !info.value!.length) {
            if (this.m_account.deviceID) {
                id = this.m_account.deviceID;
            } else if (this.m_account.peerid) {
                id = this.m_account.peerid;
            }

            if (id.length) {
                await this.m_deviceIdSave.set('deviceId', id);
            }
        } else {
            id = info.value!;
        }

        return id;
    }

    async start() {
        await this.m_deviceIdSave.load();
        await this._startLocalMaster();
    }

    private async _startLocalMaster() {
        if (this.m_process) {
            return ;
        }

        let entryfile: string = path.join(path.dirname(process.argv[1]), '../script/master_main.js');
        let deviceID: string = await this.getDeviceID();
        this.m_process = ChildProcess.fork(entryfile, [DirHelper.getRootDir(),deviceID, this.m_platform, '1'], { silent: true });
        console.log(`master_main begin run`);
        this.m_process.on('exit', (code: number, signal: string) => {
            if (this.m_sendMsgTimer) {
                clearInterval(this.m_sendMsgTimer);
                this.m_sendMsgTimer = undefined;
            }
            
            console.log(`[startup] service exit, code=${code}, signal=${signal}`);
            this.m_process = undefined;

            process.exit(0);
        });

        this.m_latestRecvTime = Date.now();
        this.m_sendMsgTimer = setInterval(() => {
            this.m_process!.send('keeplive');
            if (Date.now() - this.m_latestRecvTime > 10 * 1000) {
                process.exit(0);
            }
        }, 2000);

        this.m_process!.stdout!.on('data', (data) => {
            this.m_latestRecvTime = Date.now();
        });
    }

    protected async _stopLocalMaster() {
        if (!this.m_process) {
            return;
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
    process.chdir(path.dirname(process.argv[1]));
    let dir = path.dirname(path.dirname(process.argv[1]));
    console.log(`${dir}`);

    DirHelper.setRootDir(dir);
    let logFolder = DirHelper.getLogDir();
    DirHelper.emptyDir(logFolder);
    DirHelper.emptyDir(DirHelper.getTempDir());
    

    FileUploader.getInstance().init(GlobalConfig.fileUploadServer.host, GlobalConfig.fileUploadServer.port);

    let account: AccountStatusProfile = new AccountStatusProfile();
    await account.load();
    if (!account.accountID || account.accountID.length === 0) {
        account.accountID = process.argv[2];
    }
    if (!account.peerid || account.peerid.length === 0) {
        account.peerid = `${account.accountID}-${RandomGenerator.string(8)}`;
    }
    account.errorMsg = '正在连接服务器';
    account.save();

    let reporter = new Reporter(GlobalConfig.reportServer.host, GlobalConfig.reportServer.port, account.peerid, GlobalConfig.version);

    let loggerFun = (info: string) => {
        console.log(info);
    };
    let logger: Logger = new Logger(loggerFun, loggerFun, loggerFun, logFolder);
    let deviceIdSave = new LocalStorageJson({
        file: path.join(DirHelper.getConfigDir(), 'deviceId.json'),
        logger
    });
    let runner: Runner = new Runner({
        account,
        reporter,
        version: GlobalConfig.version,
        updateHost: GlobalConfig.updateServer.host,
        updatePort: GlobalConfig.updateServer.port,
        deviceIdSave,
        platform: os.platform(),
    });
    await runner.start();

    let runTask = (serviceid: string, taskid: string,task_type?:string) => {
        let str = JSON.stringify({serviceid, taskid,task_type});
        runner.process.send(str);
    };

    let runCmd = (_cmd: string) => {
        try {
            console.info(`#####run cmd :${_cmd}`)
            eval(_cmd);
        } catch (e) {
            console.error('e='+e);
        }
    }
    
    let rl = readline.createInterface(process.stdin, process.stdout);
    rl.on('line', (_cmd: string) => {
        runCmd(_cmd);
    });
}

main();