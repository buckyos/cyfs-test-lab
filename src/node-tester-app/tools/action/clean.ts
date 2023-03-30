
import * as os from 'os';
import * as path from 'path';
import { DirHelper } from "../../base"
import * as fs from 'fs-extra';
import * as ChildProcess from 'child_process';
let JSZIP = require("jszip");
let zip = new JSZIP();
import { Command } from 'commander';
async function empyt_task() {
    let dir_path = DirHelper.getTaskRoot();
    console.info(`remove dir ${dir_path}`);
    fs.removeSync(dir_path);
    fs.mkdirpSync(dir_path)
}
export function makeCommand() {
    return new Command('clean')
        .description("clean all task file")
        .action((options) => {
            empyt_task();
        });
}