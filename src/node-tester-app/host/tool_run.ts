import * as path from 'path';
import {AccountStatusProfile} from '../script/account_profile';
import * as ChildProcess from 'child_process';
import { Reporter, DirHelper, FileUploader, GlobalConfig, RandomGenerator, LocalStorageJson, Logger, sleep } from '../base';
import * as readline from 'readline';
import * as os from 'os';
import { fsOpenFiles } from 'systeminformation';
import * as fs from "fs-extra"
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
    private state? : string;
    
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
        this.TaskRunMonitor()
        
    }
    async TaskRunMonitor(){
        let runConfig = path.join(DirHelper.getLogDir(),"running.pid")
        let check = 0
        while(check<10){
            if(fs.existsSync(runConfig)){
                check = 0;
            }else{
                check + check + 1;
            }
            await sleep(3000)
        }
        process.exit(0);
    }
    async check_state(){
        let runConfig = path.join(DirHelper.getLogDir(),"running.pid")
        while(fs.existsSync(runConfig)){
            await sleep(5*1000);
        }
    }
    private async _startLocalMaster() {
        if (this.m_process) {
            return ;
        }
        let entryfile: string = path.join(path.dirname(process.argv[1]), '../script/master_main.js');
        let deviceID: string = await this.getDeviceID();
        this.m_process = ChildProcess.fork(entryfile, [DirHelper.getRootDir(), deviceID, this.m_platform, '1'], { silent: true });
        this.state = "run"
        this.m_process.on('exit', (code: number, signal: string) => {
            this.state = "exit"
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
            if (Date.now() - this.m_latestRecvTime > 20 * 1000) {
                process.exit(0);
            }
        }, 2000);

        this.m_process!.stdout!.on('data', (data) => {
            console.info(`recv data from client ${String(data)}`)
            if(String(data)=="exit"){
                process.exit(0);
            }
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
    
    // const serviceid = "4402";
    // const taskList = [
    //     "Connect_FristQA_TCP_direct",
    //     "Connect_FristQA_TCP_SN",
    //     "Connect_FristQA_TCP_PackageSize_answer",
    //     "Connect_FristQA_TCP_PackageSize_quesyion",
    //     "Connect_FristQA_UDP_direct",
    //     "Connect_FristQA_UDP_SN",
    //     "Connect_FristQA_UDP_PackageSize_answer",
    //     "Connect_FristQA_UDP_PackageSize_question",
    // ]
    const serviceid = "564150";
    const taskList = [
        "DMC_debuger_50MB",
    ];
    for (let i = 0; i < 10000; i++) {
        taskList.push("DMC_debuger_50MB");
    }
    for(let i in taskList){
        let runConfig = path.join(DirHelper.getLogDir(),"running.pid")
        if(!fs.existsSync(runConfig)){
            fs.createFileSync(runConfig)
        }
        let taskid = taskList[i];
        let str = JSON.stringify({serviceid, taskid});
        runner.process.send(str);
        await runner.check_state();
    }
    process.exit(0);
}

main();