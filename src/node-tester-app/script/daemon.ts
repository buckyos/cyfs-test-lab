import * as ChildProcess from 'child_process';
import * as SysProcess from 'process';
import * as path from 'path';
import { DirHelper, RandomGenerator } from '../base';
import * as fs from 'fs-extra';

async function main() {
    let dir = path.dirname(path.dirname(SysProcess.argv[1]));
    let param: string[] = ['123'];
    if (SysProcess.argv[2]) {
        param.push(SysProcess.argv[2]);
    }
    let platform = SysProcess.argv[2];
    let agentName = SysProcess.argv[3];
    console.info(`agentName:${agentName},os type ${platform}`);
    // 特定节点上报在线状态
    // if(agentName){
    //     let online = () => {
    //         let process = ChildProcess.fork(path.join(dir, 'script','online.js'), [agentName], { silent: true });
    //         process.on('exit', (code: number, signal: string) => {
    //             console.log('online process exit');
    //             online();
    //         });
    //     }
    //     online();
    // }
    DirHelper.setRootDir(dir);
    
    let deviceConfig = path.join(DirHelper.getConfigDir(), 'deviceId.json');
    try {
        if (!fs.existsSync(deviceConfig)) {
            fs.writeFileSync(deviceConfig, JSON.stringify({deviceId: RandomGenerator.string(64)}));
        }
    } catch (e) {
        console.log(`start failed, e=${e}`);
    }

    

    let launch = () => {
        let process = ChildProcess.fork(path.join(dir, 'script','startup.js'), param, { silent: true });
        process.on('exit', (code: number, signal: string) => {
            console.log('startup exit');
            launch();
        });
    }

    launch();

    await new Promise((v) => {});
}

main();