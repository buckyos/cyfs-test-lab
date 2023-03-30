

export const  Meta_miner_host_nightly = ["http://120.24.6.201:1423"]
export const  Meta_miner_host_beta = ["http://106.75.156.225:1523","http://106.75.152.253:1523","http://106.75.136.42:1523"]
export const  Meta_miner_host_formal = []

export const  Meta_spv_host_nightly = "http://120.24.6.201:3516"
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