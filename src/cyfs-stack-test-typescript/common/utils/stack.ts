

import * as cyfs from '../../cyfs_node/cyfs_node';
export let stack = cyfs.SharedCyfsStack.open_runtime();

import child_process, { ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

export const stackInfo = {
    ood : "5aSixgLyCyrX2VjQiJRWGptjDiWWfmbiDytZaBxHN8Jw",
    owner : "",
    device : "",
    appID : cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT2ze").unwrap()
}

import * as http from 'http'
async function get(url: string): Promise<string> {
    return new Promise((reslove, reject) => {
        const req = http.get(url, (resp) => {
            let resp_body = "";
            resp.on('data', (chunk) => {
                resp_body += chunk;
            });
            resp.on('end', () => {
                reslove(resp_body)
            })
        });
        req.on('error', (error) => {
            reject(error)
        })
    });
}


// check runtime opening, and also return is writable
// if runtime endpoint, return is writable
// return [isopening, iswritable]
async function check_runtime(endpoint: string): Promise<[boolean, boolean]> {
    try {
        const resp_json = await get('http://127.0.0.1:1321/check');
        const resp = JSON.parse(resp_json);
        return [true, resp.activation]
    } catch (error) {
        console.log('runtime not running')
        return [false, false]
    }
}

let child_runtime: ChildProcess | undefined = undefined;

function start_runtime() {
    let userHome, runtime_root;
    if(os.platform()==='win32'){
        userHome = process.env['USERPROFILE']!;
        runtime_root = path.join(process.env['APPDATA']!, 'cyfs');
    } else if(os.platform()==='darwin'){
        userHome = process.env['HOME']!;
        runtime_root = path.join(userHome, 'Library', 'Application Support', 'cyfs');
    } else {
        userHome = process.env['HOME']!;
        runtime_root = path.join(userHome, '.local', 'share', 'cyfs');
    }

    const runtime_exe_path =  path.join(runtime_root, "services", 'runtime', "cyfs-runtime");
    const runtime_desc_path = path.join(runtime_root, "etc", "desc");

    const anonymous = !fs.existsSync(path.join(runtime_desc_path, "device.desc"));
    let cmd = runtime_exe_path;
    if (anonymous) {
        cmd += ' --anonymous'
    }
    child_runtime = child_process.spawn(cmd, {windowsHide: true, stdio: 'ignore', shell: false});
}

export async function create_stack(endpoint: string, dec_id?: cyfs.ObjectId): Promise<[cyfs.SharedCyfsStack, boolean]> {
    if (endpoint === "ood") {
        return [cyfs.SharedCyfsStack.open_default(dec_id), true];
    } else if (endpoint === "runtime") {
        // retry 3 times
        for (let index = 0; index < 3; index++) {
            console.log('check cyfs-runtime running...')
            const [running, writable] = await check_runtime(endpoint);
            if (running) {
                
                let param = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(19999, 20000, dec_id).unwrap();
                stack = cyfs.SharedCyfsStack.open(param);
                await stack.online();
                // 获取本地数据
                let result = await stack.util().get_device_static_info({common: {flags: 0}})
                let zone_info = await result.unwrap()
                stackInfo.ood =  zone_info.info.ood_device_id.to_base_58();
                stackInfo.owner =  zone_info.info.owner_id!.to_base_58();
                stackInfo.device = zone_info.info.device_id.to_base_58();
                return [stack, writable];
            }
            if (child_runtime && child_runtime.exitCode !== null) {
                console.warn("cyfs-runtime still initalizing, please wait...");
            } else {
                console.log('cyfs-runtime not running, try start runtime...');
                start_runtime();
            }
            await cyfs.sleep(2000)
        }

        console.error('cannot start cyfs-runtime, please check cyfs-runtime status')
        process.exit(1)
        
    } else {
        console.error('invalid endpoint:', endpoint);
        throw Error("invalid endpoint")
    }
}

export function stop_runtime():void {
    if (child_runtime) {
        child_runtime.kill()
        child_runtime = undefined;
    }
}
