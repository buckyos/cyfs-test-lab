import * as path from 'path'
import * as fs from 'fs';
import * as os from 'os';
import * as ChildProcess from 'child_process';
var cmd = require('node-cmd');

//desc文件保存路径
export function descpath(file: string) {
    let path = __dirname + '/test-tool/test_' + file + '_run.desc'
    return path
}

//cmd工具操作
export async function run(filePath: string, args: string, detach: boolean, onLog?: (data: string) => void): Promise<{ err: number, code?: number }> {
    if (!fs.existsSync(filePath)) {
        console.error(`not found command process, path=${filePath}`);
        return { err: 1 };
    }
    if (detach) {
        let sub = ChildProcess.spawn(`${filePath}`, [], { stdio: 'ignore', cwd: path.dirname(filePath), detached: true, windowsHide: true });
        sub.unref();
        return { err: 2, code: 0 };
    }

    return await new Promise<{ err: number, code?: number }>((v) => {
        let process: ChildProcess.ChildProcess = ChildProcess.exec(`"${filePath}" ${args}`, { cwd: path.dirname(filePath) });
        process.once('error', (err: any) => {
            console.error(`create process failed, err=${err}, platform=${os.platform}`);
            v({ err: 3 });
        });

        process.on('exit', (code: number, singal: any) => {
            console.info(`${filePath} exit, code=${code}, singal=${singal}`);
            if (singal) {
                v({ err: 4 });
            } else {
                v({ err: 5 });
            }
        });
        process.stdout?.on('data', (data) => {
            let str = data.toString();
            // str = str.replace(/\r\n/g, '');
            // str = str.replace(/\n/g, '');
            if (onLog) {
                onLog(str);
            }
        });
        process.stderr?.on('data', (data) => {
            let str = data.toString();
            // str = str.replace(/\r\n/g, '');
            // str = str.replace(/\n/g, '');
            if (onLog) {
                onLog(str);
            }
        });
    });
}
//读取desc文件desc_buffer
export function decoder(filepath: string): Uint8Array {
    let targetDesc = path.join('', filepath);
    let desc_buf = fs.readFileSync(targetDesc);
    let desc_buffer = new Uint8Array(desc_buf);
    return desc_buffer
};

//删除测试使用的desc文件
export async function DeleteDescFile(filepath: string) {
    cmd.run('del ' + filepath)
};

