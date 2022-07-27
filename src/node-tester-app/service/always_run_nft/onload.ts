import {ErrorCode, Namespace, BufferWriter, ServiceClientInterface, RandomGenerator, NetHelper, sleep} from '../../base';
import * as ChildProcess from 'child_process';
import * as net from 'net';
import { fstat } from 'fs';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as SysProcess from 'process';
const top = require("./top_bdt2_unix.js")




export async function ServiceMain(_interface: ServiceClientInterface) {
   let always_run:ChildProcess.ChildProcess;
    _interface.registerApi('check_env', async (from: Namespace, bytes: Buffer, param: {runtime:boolean,ood:boolean}): Promise<any> => {
        
        //return {err: info.err, bytes: Buffer.from(''), value: info};
    });
    /**
     * 框架启动脚本
     */
    _interface.registerApi('start_always_run', async (from: Namespace, bytes: Buffer, param: {clientName:string}): Promise<any> => {
        let paramCmd = [param.clientName]
        let launch = () => {
            always_run = ChildProcess.fork(path.join(__dirname,'always_run.js'), paramCmd, { silent: true });
            always_run.on('exit', (code: number, signal: string) => {
                console.log('always_run  exit');
                //launch();
            });
        }
        launch();
        return {err: ErrorCode.succ, bytes: Buffer.from(''), value:"start_always_run"};
    });
    /**
     * 框架启动脚本
     */
    _interface.registerApi('stop_always_run', async (from: Namespace, bytes: Buffer, param: {}): Promise<any> => {
        let run =  always_run.emit("exit")
        return {err: ErrorCode.succ, bytes: Buffer.from(''), value:"stop_always_run"};
    });
}