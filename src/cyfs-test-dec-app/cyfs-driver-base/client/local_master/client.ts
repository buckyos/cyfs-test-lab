import { EventEmitter } from "events";
import { Logger, ErrorCode, FormatDateHelper, DirHelper, RandomGenerator } from '../../../common';
import { Namespace, Channel, NamespaceHelper, ClientExitCode, Command, SysCommandName, ChannelOptions, CommandDispatch } from "../../command";
import * as ChildProcess from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import { GlobalConfig } from "../base/global_config";

export type ClientProxyOptions = ChannelOptions & {
    
}

export class ClientProxy extends Channel {
    protected m_dispatcher: CommandDispatch;
    protected m_process?: ChildProcess.ChildProcess;
    protected m_keepliveTimer?: NodeJS.Timer;

    protected m_key: string;

    constructor(options: ClientProxyOptions) {
        super(options);
        this.m_key = RandomGenerator.string(32);
        this.m_dispatcher = new CommandDispatch();
    }

    get dispatcher(): CommandDispatch {
        return this.m_dispatcher;
    }

    get key(): string {
        return this.m_key;
    }

    onPing(c: Command) {
        //do nothing
    }

    forkProcess(file: string, param: any) {
        let now = FormatDateHelper.now('MM-dd-HH-mm-ss-SS');
        param.logPath = DirHelper.getLogDir(`${now}-${RandomGenerator.string(4)}`);
        let paramPath: string = path.join(param.logPath, 'param.json');
        try {
            fs.writeFileSync(paramPath, JSON.stringify(param));
        } catch(err) {
            console.error(`write param failed, err=${err}`);
        }
        
        this.m_process = ChildProcess.fork(file, [paramPath], {silent: true});
        this.m_process.on('error',(error)=>{
            console.error(`###### TASK CLIENT RUN ERROR,${error}`)
        })
        this.m_process.on('exit', (code: number, signal: string) => {
            console.error(`###### TASK CLIENT RUN EXIST`)
            this.m_process = undefined;
            if (signal) {
                code = ClientExitCode.killed;
            } else {
                //主动退出
            }

            if (this.m_keepliveTimer) {
                clearInterval(this.m_keepliveTimer);
                this.m_keepliveTimer = undefined;
            }

            if (GlobalConfig.removeLog) {
                DirHelper.emptyDir(param.logPath, true);
            }
            let runConfig = path.join(DirHelper.getLogDir(),"running.pid")
            if(fs.existsSync(runConfig)){
                fs.removeSync(runConfig);
            }
            this.emit('close', this, code);
        });

        this.m_keepliveTimer = setInterval(() => {
            this.m_process!.send('1');
        }, 2000);
    }

    async stopProcess(): Promise<ErrorCode> {
        console.info(`######  CLIENT stopProcess `)
        if (!this.m_process) {
            return ErrorCode.notExist;
        }
        return await new Promise<ErrorCode>((v) => {
            this.m_process!.once('exit', () => {
                
                v(ErrorCode.succ);
            });

            this.m_process!.kill();
        });
    }
}