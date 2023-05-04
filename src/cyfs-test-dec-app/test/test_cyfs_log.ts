import * as cyfs from "../cyfs"
import {Logger} from "../cyfs-test-base"
import path from "path"

function log1(log_dir:string) {
    cyfs.clog.enable_file_log({
        name: "cyfs_stack1",
        dir: log_dir,
        file_max_size: 1024 * 1024 * 10,
        file_max_count: 10,
    });
    let logger = new Logger(cyfs.clog.info, cyfs.clog.debug, cyfs.clog.error, log_dir)
    console.info(`test2`)
}

function log2(log_dir:string) {
    cyfs.clog.enable_file_log({
        name: "cyfs_stack2",
        dir: log_dir,
        file_max_size: 1024 * 1024 * 10,
        file_max_count: 10,
    });
    let logger = new Logger(cyfs.clog.info, cyfs.clog.debug, cyfs.clog.error, log_dir)
    console.info(`test1`)
}
async function main() {
    let log_dir = path.join(__dirname,"../blog");
    log1(log_dir)
    log2(log_dir)
    await cyfs.sleep(5000)
    
}
main();