

import * as cyfs from "../cyfs"
import {RandomGenerator} from "../common"
import {Uint8Array_to_string,string_to_Uint8Array} from "../dec-app-action"
const dec_app_1 = cyfs.ObjectId.from_base_58("9tGpLNndR5tyui8DkYBpEz8mFHzjfqkCVmsFusa5roHd").unwrap()
async function rand_cyfs_chunk_cache(chunk_size:number):Promise<{err:number,chunk_id:cyfs.ChunkId,chunk_data:Uint8Array}>{
    console.info(`rand_cyfs_chunk_cache data_size = ${chunk_size}`)
    let chunk_data =  string_to_Uint8Array(RandomGenerator.string(chunk_size));
    //console.info(chunk_data);
    let chunk_id =  cyfs.ChunkId.calculate(chunk_data);
    return{err:0,chunk_id,chunk_data}
}
async function main() {
    let random_chunk = await rand_cyfs_chunk_cache(100*1024*1024);
    console.info(`chunk : ${random_chunk.chunk_id}`);
    let stack = cyfs.SharedCyfsStack.open_runtime(dec_app_1);
    let check = await stack.wait_online()
    let test = await stack.ndn_service().put_data({
        common : {
            flags : 1,
            level : cyfs.NDNAPILevel.NDC,
        },
        object_id: random_chunk.chunk_id.calculate_id(),
        length: 1*1024*1024,
        data: random_chunk.chunk_data,
    })
    console.info(test);
}
main()
