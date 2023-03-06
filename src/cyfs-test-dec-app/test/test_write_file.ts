import * as cyfs from "../cyfs"
import {RandomGenerator} from "../base"
import {Uint8Array_to_string,string_to_Uint8Array} from "../common_action"
import * as fs from "fs-extra";

async function main() {
    let buf_str = Buffer.from(RandomGenerator.string(1024*1024));
    let x = 40;
    while(x--){
        let file_path = `E:\\file3\\test_${x}.txt`;
    let i = 100;
    while(i>0){
        await fs.appendFileSync(file_path, buf_str)
        i = i -1;
    }
    }
    
}
main()