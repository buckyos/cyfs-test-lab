

import * as cyfs from "../cyfs"

async function test_fun(data:number):Promise<cyfs.BuckyResult<number>>{
    if(data>0){
        return cyfs.Ok(data)
    }else{
        const error = new cyfs.BuckyError(cyfs.BuckyErrorCode.Failed, `error resp data`);
        return cyfs.Err(error)
    }
}

async function main() {
    cyfs.clog.enable_file_log({
        name: "cyfs_stack",
        file_max_size: 1024 * 1024 * 10,
        file_max_count: 10,
    });
    let result = await test_fun(-1);
    console.info(`${result}`)
}
main();
