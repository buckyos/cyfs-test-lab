import * as cyfs from "../cyfs"
import {RandomGenerator} from "../base"
import {Uint8Array_to_string,string_to_Uint8Array} from "../common_action"

async function rand_cyfs_chunk_cache(chunk_size:number):Promise<{err:number,chunk_id:cyfs.ChunkId,chunk_data:Uint8Array}>{
    console.info(`rand_cyfs_chunk_cache data_size = ${chunk_size}`)
    let chunk_data =  string_to_Uint8Array(RandomGenerator.string(chunk_size));
    console.info(chunk_data);
    let chunk_id =  cyfs.ChunkId.calculate(chunk_data).unwrap();
    return{err:0,chunk_id,chunk_data}
}
async function main() {
    let chunk_data =  string_to_Uint8Array(RandomGenerator.string(100*1024));
    let data =  cyfs.HashValue.hash_data(chunk_data);
    console.info(`result1 = ${JSON.stringify(data)}`)
    chunk_data =  string_to_Uint8Array(RandomGenerator.string(1024*1024));
    data =  cyfs.HashValue.hash_data(chunk_data);
    console.info(`result2 = ${JSON.stringify(data)}`)
}
main()