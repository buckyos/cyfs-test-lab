import { ErrorCode,LocalStorageJson,Logger,FileUploader,DirHelper, sleep } from "../../common";
import { Rpc,Namespace, CommandDispatch, Command, CommandSysPingReq, SysCommandName,stringifyComand, NamespaceHelper, ClientExitCode } from "../../command";
import * as fs from 'fs';
import * as path from 'path';
import { Channel } from "../../command/channel";
import * as SysUtil from 'util';
import * as compressing from 'compressing';

export interface ClientStackInterface {
    report(opt: string, param: any): ErrorCode;
    exit(code: ClientExitCode, msg: string, timeout?: number): Promise<void>;
    getLogger(): Logger;
    getNamespace(): Namespace;
    zip(srcfile: string, dstfileName: string): Promise<{err: ErrorCode, dstPath?: string}>;
    uploadFile(file: string, remoteDir?: string): Promise<{err: ErrorCode, url?: string}>;
    getPlatform(): string;
}

export type ClientStackOptions = {
    namespace: Namespace;
    logger: Logger;
    version: string;
    heartbeatIntervalTime: number;
    storage: LocalStorageJson;
    key: string,
    platform: string,
};

export class ClientStack implements ClientStackInterface {
    public static MinTimeout: number = 100 * 1000;
    private m_ip?: string;
    private m_port?: number;
    
    private m_version: string;
    private m_heartbeatIntervalTime: number;
    private m_heartbeatTimer?: NodeJS.Timer;
    private m_seq: number;
    private m_localStorage: LocalStorageJson;
    protected m_logger: Logger;
    protected m_key: string;
    protected m_dispatcher: CommandDispatch;
    protected m_platform: string;

    private m_channelWithMaster: Channel;

    constructor(options: ClientStackOptions) {
        this.m_version = options.version;
        this.m_heartbeatIntervalTime = options.heartbeatIntervalTime;

        this.m_seq = 1;
        this.m_logger = options.logger;
        this.m_localStorage = options.storage;
        this.m_channelWithMaster = new Channel({
            namespace: options.namespace,
            logger: options.logger,
            timeout: options.heartbeatIntervalTime * 3000,
        });
        this.m_key = options.key;
        this.m_platform = options.platform;
        this.m_dispatcher = new CommandDispatch();
    }

    get dispatcher(): CommandDispatch {
       return this.m_dispatcher;
    }

    get namespace(): Namespace {
        return this.m_channelWithMaster.namespace;
    }

    get logger(): Logger {
        return this.m_channelWithMaster.logger;
    }

    get version(): string {
        return this.m_version;
    }

    set version(v: string) {
        this.m_version = v;
    }

    get localStorage(): LocalStorageJson {
        return this.m_localStorage;
    }

    get heartbeatTime(): number {
        return this.m_heartbeatIntervalTime;
    }

    get nextSeq(): number {
        return this.m_seq++;
    }

    get channelWithMaster(): Channel {
        return this.m_channelWithMaster;
    }

    getPlatform(): string {
        return this.m_platform;
    }

    init(serverHost: string, serverPort: number): ErrorCode {
        this.m_ip = serverHost;
        this.m_port = serverPort;

        this.channelWithMaster.on('command', (channel: Channel, command: Command) => {
            if (NamespaceHelper.isNamespaceEqual(command.to, this.namespace)) {
                this.dispatcher.dispatch(command);
            }
        });

        return ErrorCode.succ;
    }

    async start(): Promise<ErrorCode> {
        return await this._init();
    }

    async exit(code: ClientExitCode, msg: string, timeout?: number) {
        await sleep(3000);
        process.exit(code);
    }

    getLogger(): Logger {
        return this.logger;
    }
    getNamespace(): Namespace {
        return this.namespace;
    }

    async zip(srcfile: string, dstfileName: string): Promise<{err: ErrorCode, dstPath?: string}> {
        let lstat = SysUtil.promisify(fs.lstat);
        let readFile = SysUtil.promisify(fs.readFile);
        let readDir = SysUtil.promisify(fs.readdir);
        let existFile = SysUtil.promisify(fs.exists);
        let unlink = SysUtil.promisify(fs.unlink);
        let copyFile = SysUtil.promisify(fs.copyFile);

        let copyDir = async (baseDir: string, file: string, dstDir: string) => {
            let absPath = path.join(baseDir, file);
            let stat = await lstat(absPath);
            if (stat.isFile()) {
                await copyFile(absPath, path.join(dstDir, file));
            } else {
                DirHelper.ensureDirExist(path.join(dstDir, file));
                let files = await readDir(absPath);
                for (let f of files) {
                    await copyDir(path.join(baseDir, file), f, path.join(dstDir, file));
                }
            }
        };
        try {
            if(!await existFile(srcfile)) {
                return {err: ErrorCode.notExist};
            }
    
            let dstPath = path.join(DirHelper.getTempDir(), dstfileName);
            if (fs.existsSync(dstPath)) {
                await unlink(dstPath);
            }
    
            let stat = await lstat(srcfile);
            if (stat.isFile()) {
                let copyedFile: string = path.join(DirHelper.getTempDir(), path.basename(srcfile));
                await copyFile(srcfile, copyedFile);
                await compressing.zip.compressFile(copyedFile, dstPath);
                await unlink(copyedFile);
            } else {
                await copyDir(path.dirname(srcfile), path.basename(srcfile), DirHelper.getTempDir());
                await compressing.zip.compressDir(path.join(DirHelper.getTempDir(), path.basename(srcfile)), dstPath); 
                await DirHelper.emptyDir(path.join(DirHelper.getTempDir(), path.basename(srcfile)));
                await fs.rmdirSync(path.join(DirHelper.getTempDir(), path.basename(srcfile)));
            }

            return {err: ErrorCode.succ, dstPath};
        } catch (err) {
            this.logger.error(`zip failed, src=${srcfile}, dst=${dstfileName}, err=${err}`);
            return {err: ErrorCode.exception};
        }
    }

    async uploadFile(file: string, remoteDir?: string): Promise<{err: ErrorCode, url?: string}> {
        if (!fs.existsSync(file)) {
            return {err: ErrorCode.notExist};
        }

        let info: any = await FileUploader.getInstance().upload(file, remoteDir);
        if (info.result !== 0) {
        	this.m_logger.error(`uploadfile failed,info=${JSON.stringify(info)}`);
            return {err: ErrorCode.netError};
        }

        return {err: ErrorCode.succ, url: info.content.url};
    }

    report(opt: string, param: any): ErrorCode {
        return ErrorCode.succ;
    }

    async waitCommand(name: string, seq: number, timeout?: number): Promise<{err: ErrorCode, c?: Command}> {
        if (timeout && timeout < ClientStack.MinTimeout) {
            timeout = ClientStack.MinTimeout;
        }

        return await new Promise<{err: ErrorCode, c?: Command}>((v) => {
            let timeoutTimer: NodeJS.Timer | undefined = undefined;
            let cookieInfo: any;
            let clearTimer = () => {
                if (timeoutTimer) {
                    clearTimeout(timeoutTimer);
                    timeoutTimer = undefined;
                }
            };

            let startTimer = () => {
                if (timeout) {
                    timeoutTimer = setTimeout(() => {
                        timeoutTimer = undefined;
                        this.dispatcher.removeHandler(name, cookieInfo.cookie!);
                        v({err: ErrorCode.timeout});
                    }, timeout!);
                }
            };

            cookieInfo = this.dispatcher.addHandler(name, (c: Command) => {
                clearTimer();

                if ((c as any).err && (c as any).err === ErrorCode.waiting) {
                    startTimer();
                    return;
                }

                if (cookieInfo && !cookieInfo.err && cookieInfo.cookie) {
                    this.dispatcher.removeHandler(name, cookieInfo.cookie!);
                }

                v({err: ErrorCode.succ, c});
            }, (c: Command): boolean => {
                return c.seq === seq;
            });

            startTimer();
        });
    }

    protected _generateHeartbeatCommand(): Command {
        let c: CommandSysPingReq = {
            from: this.namespace,
            to: {agentid: this.namespace.agentid, serviceid: NamespaceHelper.LocalMasterServiceId},
            name: SysCommandName.sys_ping_req,
            seq: this.nextSeq,
            key: this.m_key,
        };
        return c;
    }

    protected _isRetryRpc(): boolean {
        return false;
    }

    private _beginHeartbeat() {
        this.m_heartbeatTimer = setInterval(async () => {
            let c: Command = this._generateHeartbeatCommand();
            this.m_channelWithMaster.send(c);
        }, this.m_heartbeatIntervalTime);
    }

    private _endHeartbeat() {
        if (this.m_heartbeatTimer) {
            clearInterval(this.m_heartbeatTimer);
            this.m_heartbeatTimer = undefined;
        }
    }

    private async _init(): Promise<ErrorCode> {
        let info = await this._connectImpl(this.m_ip!, this.m_port!);
        if (info.err) {
            return info.err;
        }

        this.m_channelWithMaster.initFromRpc(info.rpc!);

        let onTimeout = (c: Channel) => {
            this.m_channelWithMaster.removeListener('timeout', onTimeout);
            this._endHeartbeat();
            if (this._isRetryRpc()) {
                this._init();   
            }
        };
        this.m_channelWithMaster.on('timeout', onTimeout);
        
        this._beginHeartbeat();

        return ErrorCode.succ;
    }


    private async _connectImpl(ip: string, port: number): Promise<{err: ErrorCode, rpc?: Rpc}> {
        do {
            let filename: string | undefined;
            // if (path.basename((require.main as any).filename) === 'master_main.js') {
            //     filename = path.join(DirHelper.getTempDir(), 'master_command');
            // }
            let rpc: Rpc = new Rpc({logger: this.m_logger, filename});
            let err = await new Promise<ErrorCode>((v) => {
                rpc.once('establish', (r: Rpc) => {
                    rpc.removeAllListeners();
                    rpc.send(this._generateHeartbeatCommand());
                    v(ErrorCode.succ);
                });
    
                rpc.once('error', (r: Rpc, errcode: ErrorCode) => {
                    this.m_logger.debug(`connect to server failed,ip=${ip},port=${port} will retry`);
                    v(errcode);
                });
    
                let err = rpc.connect(ip, port);
                if (err) {
                    v(err);
                }
            });

            if (!err) {
                return {err: ErrorCode.succ, rpc};
            }
        } while(this._isRetryRpc());

        return {err: ErrorCode.fail};
    }
}