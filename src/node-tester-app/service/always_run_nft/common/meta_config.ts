

import * as cyfs from '../cyfs';

export const  Meta_miner_host_local = ["http://192.168.100.77:1423"]
export const  Meta_miner_host_nightly = ["http://154.31.50.111:1423"]
export const  Meta_miner_host_beta = ["http://106.75.156.225:1523","http://106.75.152.253:1523","http://106.75.136.42:1523"]
export const  Meta_miner_host_formal = []


export const  Meta_spv_host_local = "http://192.168.100.77:1663"
export const  Meta_spv_host_nightly = "http://154.31.50.111:3516"
export const  Meta_spv_host_beta = "http://106.75.152.253:1563"
export const  Meta_spv_host_formal = ""


export function check_array_contain(arr:Array<string>,str:string){
    for(let i in arr){
        if(arr[i] == str){
            return true;
        }
    }
    return false;
}
/*
连接本地链
*/
export function get_my_meta_client(miner:Array<string>,spv:string):cyfs.MetaClient{
    const meta_client_local = new cyfs.MetaClient(miner[0],spv)
    return meta_client_local;
}
export const Meta_client_nightly = get_my_meta_client(Meta_miner_host_nightly,Meta_spv_host_nightly)


