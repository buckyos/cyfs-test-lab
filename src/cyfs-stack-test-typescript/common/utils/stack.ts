

import * as cyfs from '../../cyfs_node/cyfs_node';
export let stack = cyfs.SharedCyfsStack.open_runtime();

export const stackInfo = {
    ood : "5aSixgLyCyrX2VjQiJRWGptjDiWWfmbiDytZaBxHN8Jw",
    owner : "",
    device : "",
    appID : cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT2ze").unwrap()
}

export async function init_stack(type:string="runtime") {
    if(type == "runtime"){
        stack = cyfs.SharedCyfsStack.open_runtime();
    }
    if(type == "ood"){
        stack = cyfs.SharedCyfsStack.open_default();
    }
    await stack.online();
    // 获取本地数据
    let result = await stack.util().get_device_static_info({common: {flags: 0}})
    let zone_info = await result.unwrap()
    stackInfo.ood =  zone_info.info.ood_device_id.to_base_58();
    stackInfo.owner =  zone_info.info.owner_id!.to_base_58();
    stackInfo.device = zone_info.info.device_id.to_base_58();
    
}