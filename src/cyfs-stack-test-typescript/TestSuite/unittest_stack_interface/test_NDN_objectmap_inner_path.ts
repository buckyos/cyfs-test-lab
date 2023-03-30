import * as fs from "fs-extra";
import assert = require('assert');
import * as cyfs from '../../cyfs_node'
import { ZoneSimulator, stringToUint8Array, RandomGenerator, stackInfo, stack } from "../../common";
import * as path from 'path';
import * as gen_Dir from "../../common/utils/generator"
import * as events from 'events'
export const Emitter = new events.EventEmitter();


type level_ty =  cyfs.NDNAPILevel | cyfs.NONAPILevel 
type stack_va_ty = cyfs.SharedCyfsStack[] | level_ty[] |  boolean[]
type stack_ty = {[x: string]:stack_va_ty} 


let stack_runtime: cyfs.SharedCyfsStack;
let stack_ood: cyfs.SharedCyfsStack;
let zone1ood : cyfs.SharedCyfsStack;
let zone1device1 : cyfs.SharedCyfsStack;
let zone1device2 : cyfs.SharedCyfsStack;
let zone2ood : cyfs.SharedCyfsStack;
let zone2device1 : cyfs.SharedCyfsStack;
let zone2device2 : cyfs.SharedCyfsStack;

//初始化日志
cyfs.clog.enable_file_log({
    name: "unittest_stack_interface",
    dir: cyfs.get_app_log_dir("unittest_stack_interface"),
    file_max_size: 1024 * 1024 * 10,
    file_max_count: 10,
});

//dec参数
const DecId = {
    DecIdA: cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap(),
    DecIdB: cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap(),
    DecIdC: cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT7ze").unwrap(),
    DecIdD: cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT8ze").unwrap(),
    DecIdE: cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT9ze").unwrap(),
    DecIdF: cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT1ze").unwrap(),
    DecIdAny: cyfs.get_anonymous_dec_app(),
    DecIdSys: cyfs.get_system_dec_app()
}

let devices = 
[
"sam_dev_sam_zone_sam_dec",
"sam_dev_sam_zone_dif_dec",
"dif_dev_sam_zone_sam_dec",
"dif_dev_dif_zone_sam_dec",
"dif_dev_sam_zone_dif_dec",
"dif_dev_dif_zone_dif_dec"
]

let AccPermissions : cyfs.AccessPermissions [] = [
    cyfs.AccessPermissions.None,
    cyfs.AccessPermissions.CallOnly,
    cyfs.AccessPermissions.WriteOnly,
    cyfs.AccessPermissions.WirteAndCall,
    cyfs.AccessPermissions.ReadOnly,
    cyfs.AccessPermissions.ReadAndCall,
    cyfs.AccessPermissions.ReadAndWrite,
    cyfs.AccessPermissions.Full
]


interface FileTransTask {
    fileName: string,
    savePath: string,
    object_id: cyfs.ObjectId,   
    state?: number
}
    
interface TreeNode {
// 只有根节点没有名字
name?: string,

// 判断是不是叶子节点还是中间的目录结构
type: 'dir' | 'object',

// type = 'dir'情况下有子节点
subs?: Map<string, TreeNode>,

// type='object'情况下有object_id
object_id?: cyfs.ObjectId,
}


/*common handler----------------------------------------------------------------------------------------------------------------------------------------------------------*/

//重建dir的目录树结构
async function build_dir(stack: cyfs.SharedCyfsStack, dir_id: cyfs.DirId) {
    const req = {
        common: {
            level: cyfs.NONAPILevel.Router,
            flags: 0,
        },
        object_id: dir_id.object_id,
    };
    
    const resp = await stack.non_service().get_object(req);
    if (resp.err) {
        console.error(`get dir object from router error!`, resp);
        return;
    }
    
    const ret = resp.unwrap();
    const [dir, _] = new cyfs.DirDecoder().raw_decode(ret.object.object_raw).unwrap();
    
    let root: TreeNode = {
        type: 'dir',
        subs: new Map(
    
        ),
    };
    console.info(root)
    
    dir.desc().content().obj_list().match({
        Chunk: (chunk_id: cyfs.ChunkId) => {
            console.error(`obj_list in chunk not support yet! ${chunk_id}`);
        },
        ObjList: (obj_list) => {
            for (const [inner_path, info] of obj_list.object_map().entries()) {
                const segs = inner_path.value().split('/');
                console.assert(segs.length > 0);
                console.info(`###节点信息：${inner_path},${info.node().object_id()}`)
                // 一个叶子节点就是一个object_id，可能是FileObj，也可能是DirObj
                const leaf_node: TreeNode = {
                    name: segs.pop(),
                    type: 'object',
                    object_id: info.node().object_id()!,
                };
    
                let cur = root.subs!;
                for (const seg of segs) {
                    if (!cur.get(seg)) {
                        const sub_node: TreeNode = {
                            name: seg,
                            type: 'dir',
                            subs: new Map(),
                        };
                        console.info(`添加叶子节点dir：${seg} ${sub_node}`)
                        cur!.set(seg, sub_node);
                    }
                    cur = cur.get(seg)!.subs!;
                }
    
                cur.set(leaf_node.name!, leaf_node);
                console.info(`添加叶子节点object：${leaf_node.name!} ${leaf_node}`)
            }
        }
    });
    return root;
    
    }
        
async function buildDirTree(root: TreeNode, inner_path: cyfs.BuckyString, info: cyfs.InnerNodeInfo) {
    
    const segs = inner_path.value().split('/');

    if (segs.length <= 0) {
        assert(false, "inner_path error")
    }
    else if (segs.length === 1) {
        //console.info(`$$$${inner_path},${segs[0]}`)
        root.subs!.set(segs[0], {
            name: segs[0],
            type: 'object',
            object_id: info.node().object_id()!,
        })
        console.info(`${root.subs!.get(segs[0])!.object_id}`)
    } else if (!root.subs!.get(segs[0])) {
        //console.info(`&&&${inner_path}`)
        let path = ""
        for (let s in segs.slice(1)) {
            path = path + segs.slice(1)[s]
        }
        root.subs!.set(segs[0],
            {
                name: segs[0],
                type: 'dir',
                subs: new Map()
            }

        )
        root.subs!.get(segs[0])!.subs = await buildDirTree(root.subs!.get(segs[0])!, new cyfs.BuckyString(path), info)
    }
    else {
        // console.info(`***${inner_path}`)
        let path = ""
        for (let s in segs.slice(1)) {
            path = path + segs.slice(1)[s]
        }
        root.subs!.get(segs[0])!.subs = await buildDirTree(root.subs!.get(segs[0])!, new cyfs.BuckyString(path), info)
    }
    for (let [abc, test] of root.subs!.entries()) {
        console.info(`##### ${JSON.stringify(abc)}`)
        console.info(`##### ${JSON.stringify(test)}`)
    }
    //console.info(`%%%%${root.subs!.values()}`)
    return root.subs;

}

class GetObjectHandlerDefault implements cyfs.RouterHandlerGetObjectRoutine {
    private device: string;
    private handlerId: string;
    private chain: string
    constructor(device: string, handlerId: string, chain: string) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param: cyfs.RouterHandlerGetObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerGetObjectResult>> {
        Emitter.emit('handlerRunning', this.device, 'GetObjectHandlerDefault', this.handlerId, this.chain)
        const codec = new cyfs.NONGetObjectOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));

        console.info(`get_object: id=${param.request.object_id}`);
        const result: cyfs.RouterHandlerGetObjectResult = {
            // 直接终止路由并以resp作为应答
            // 如果需要同时保存，那么替换为ResponseAndSave即可
            action: cyfs.RouterHandlerAction.Default
        };
        return cyfs.Ok(result)
    }
}

/*common functions----------------------------------------------------------------------------------------------------------------------------------------------------*/
//acl参数生成
async function gen_acl(type:string,per:cyfs.AccessPermissions = cyfs.AccessPermissions.Full,acc_num?:number):Promise<cyfs.AccessString|undefined>{
    let acc:cyfs.AccessString
    switch(type){
        case"num":{
            //acc_num 0o777
            acc= (new cyfs.AccessString(acc_num!))}
            return acc
        case"method":{
            acc= cyfs.AccessString.full()}
            return acc
        case"set":{
            acc = new cyfs.AccessString(0)
            acc.set_group_permissions(cyfs.AccessGroup.OthersZone,per)
            acc.set_group_permissions(cyfs.AccessGroup.OthersDec,per)
            acc.set_group_permissions(cyfs.AccessGroup.CurrentDevice,per)
            acc.set_group_permissions(cyfs.AccessGroup.CurrentZone,per)
            acc.set_group_permissions(cyfs.AccessGroup.OwnerDec,per)
            acc.set_group_permissions(cyfs.AccessGroup.FriendZone,per)
            return  acc
        }
    }
}
//[zone1ood,zone1device1,zone2ood,zone2device1]

//本测试使用的的acl生成
async function r_meta_acc_acl(source:cyfs.SharedCyfsStack,target:cyfs.SharedCyfsStack,path:string,per:cyfs.AccessPermissions):Promise<cyfs.PathOpEnvStub[]|undefined>{
            
            let acc:cyfs.AccessString
            acc = new cyfs.AccessString(0)
            acc.set_group_permissions(cyfs.AccessGroup.OthersZone,per)
            acc.set_group_permissions(cyfs.AccessGroup.OthersDec,per)
            acc.set_group_permissions(cyfs.AccessGroup.CurrentDevice,per)
            acc.set_group_permissions(cyfs.AccessGroup.CurrentZone,per)
            acc.set_group_permissions(cyfs.AccessGroup.OwnerDec,per)
            acc.set_group_permissions(cyfs.AccessGroup.FriendZone,per)
            
            //rmeta acl
            await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(path,acc))
            await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(path,acc))
            
            //root_state acl
            let env_acc:cyfs.RootStateOpEnvAccess = {
            path:path,
            access:cyfs.AccessPermissions.Full 
            }
            let stub_source = source.root_state_stub(undefined,undefined)
            let stub_target = target.root_state_stub(undefined,undefined)

            let source_opEnv = (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
            let target_opEnv = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
            console.info("root_state_acc_source: ",(source_opEnv))
            console.info("root_state_acc_target: ",(target_opEnv))
            

            return [source_opEnv,target_opEnv]

}
//协议栈连接生成
async function stacks(type:string,stack:cyfs.SharedCyfsStack[]):Promise <stack_ty|undefined>{
    switch(type){
        case "sam_dev_sam_zone_sam_dec":
            let stacks_1 = [stack[0].fork_with_new_dec(DecId.DecIdA),stack[0].fork_with_new_dec(DecId.DecIdA)]
            
            let getdate_stacks_1 = [stacks_1[0],stacks_1[0],stacks_1[0],stacks_1[0],stacks_1[0],stacks_1[0],stacks_1[0],stacks_1[0],stacks_1[0],stacks_1[0]]
            let test_getdate_stacks_1 = [stacks_1[0],stacks_1[0],stacks_1[0]]
            let getdate_level_1 = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON,cyfs.NDNAPILevel.NDN]
            let getdate_assert_1 = [true,true,true,true,true,true]

            let trans_stacks_1 = [stacks_1[0],stacks_1[0],stacks_1[0],stacks_1[0],stacks_1[0],stacks_1[0],stacks_1[0],stacks_1[0],stacks_1[0],stacks_1[0]]
            let test_trans_stacks_1 = [stacks_1[0],stacks_1[0],stacks_1[0]]
            let trans_level_1  = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON,cyfs.NDNAPILevel.NDN] 
            let trans_assert_1 = [true,true,true,true,true,true]

        return {
                "stacks":stacks_1,
                "getdate_stacks": getdate_stacks_1, "test_getdate_stacks": test_getdate_stacks_1,"getdate_level" : getdate_level_1, "getdate_assert":getdate_assert_1,
                "trans_stacks" :  trans_stacks_1 , " test_trans_stacks" :  test_trans_stacks_1 , "trans_level" : trans_level_1 , "trans_assert" : trans_assert_1
            }

        case "sam_dev_sam_zone_dif_dec":
            let stacks_2 = [stack[0].fork_with_new_dec(DecId.DecIdB),stack[0].fork_with_new_dec(DecId.DecIdC)]
            let getdate_stacks_2 = [stacks_2[0],stacks_2[0],stacks_2[0],stacks_2[0],stacks_2[0],stacks_2[0],stacks_2[0],stacks_2[0],stacks_2[1],stacks_2[1]]
            let test_getdate_stacks_2 = [stacks_2[1],stacks_2[1],stacks_2[0]]
            let getdate_level_2 = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON,cyfs.NDNAPILevel.NDN]
            let getdate_assert_2 = [true,true,true,true,true,true]
            
            let trans_stacks_2 = [stacks_2[0],stacks_2[0],stacks_2[0],stacks_2[0],stacks_2[0],stacks_2[0],stacks_2[0],stacks_2[0],stacks_2[1],stacks_2[1]]
            let test_trans_stacks_2 = [stacks_2[1],stacks_2[1],stacks_2[0]]
            let trans_level_2  = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON,cyfs.NDNAPILevel.NDN]
            let trans_assert_2 = [true,true,true,true,true,true]

            return {
                "stacks":stacks_2,
                "getdate_stacks": getdate_stacks_2, "test_getdate_stacks": test_getdate_stacks_2,"getdate_level" : getdate_level_2, "getdate_assert":getdate_assert_2,
                "trans_stacks" :  trans_stacks_2 , " test_trans_stacks" :  test_trans_stacks_2 , "trans_level" : trans_level_2 , "trans_assert" : trans_assert_2
            }
               
        case "dif_dev_sam_zone_sam_dec":
            let stacks_3 = [stack[0].fork_with_new_dec(DecId.DecIdD),stack[1].fork_with_new_dec(DecId.DecIdD)]
            let getdate_stacks_3 = [stacks_3[0],stacks_3[0],stacks_3[0],stacks_3[0],stacks_3[0],stacks_3[0],stacks_3[0],stacks_3[0],stacks_3[1],stacks_3[1]]
            let test_getdate_stacks_3 =[stacks_3[1],stacks_3[1],stacks_3[0]]
            let getdate_level_3 = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON,cyfs.NDNAPILevel.NDN]
            let getdate_assert_3 = [true,true,true,true,true,true]

            let trans_stacks_3 =[stacks_3[0],stacks_3[0],stacks_3[0],stacks_3[0],stacks_3[0],stacks_3[0],stacks_3[0],stacks_3[0],stacks_3[1],stacks_3[1]]
            let test_trans_stacks_3 =[stacks_3[1],stacks_3[1],stacks_3[0]]
            let trans_level_3  = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON,cyfs.NDNAPILevel.NDN]
            let trans_assert_3 = [true,true,true,true,true,true]
            
            return {
                "stacks":stacks_3,
                "getdate_stacks": getdate_stacks_3, "test_getdate_stacks": test_getdate_stacks_3,"getdate_level" : getdate_level_3, "getdate_assert":getdate_assert_3,
                "trans_stacks" :  trans_stacks_3 , " test_trans_stacks" :  test_trans_stacks_3 , "trans_level" : trans_level_3 , "trans_assert" : trans_assert_3
                }

        case "dif_dev_dif_zone_sam_dec":
            let stacks_4 = [stack[0].fork_with_new_dec(DecId.DecIdE),stack[2].fork_with_new_dec(DecId.DecIdE)]
            let getdate_stacks_4 = [stacks_4[0],stacks_4[0],stacks_4[0],stacks_4[0],stacks_4[0],stacks_4[0],stacks_4[0],stacks_4[0],stacks_4[1],stacks_4[1]]
            let test_getdate_stacks_4 =[stacks_4[1],stacks_4[1],stacks_4[0]]
            let getdate_level_4 = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON,cyfs.NDNAPILevel.NDN]
            let getdate_assert_4 = [true,true,true,true,true,true]
            
            let trans_stacks_4 =  [stacks_4[0],stacks_4[0],stacks_4[0],stacks_4[0],stacks_4[0],stacks_4[0],stacks_4[0],stacks_4[0],stacks_4[1],stacks_4[1]]
            let test_trans_stacks_4 =[stacks_4[1],stacks_4[1],stacks_4[0]]
            let trans_level_4  = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON,cyfs.NDNAPILevel.NDN]
            let trans_assert_4 = [true,true,true,true,true,true]
          
            return {
                "stacks":stacks_4,
                "getdate_stacks": getdate_stacks_4, "test_getdate_stacks": test_getdate_stacks_4,"getdate_level" : getdate_level_4, "getdate_assert":getdate_assert_4,
                "trans_stacks" :  trans_stacks_4 , " test_trans_stacks" :  test_trans_stacks_4 , "trans_level" : trans_level_4 , "trans_assert" : trans_assert_4
                }

        case "dif_dev_sam_zone_dif_dec":
            let stacks_5 = [stack[2].fork_with_new_dec(DecId.DecIdF),stack[3].fork_with_new_dec(DecId.DecIdF)]
            let getdate_stacks_5 = [stacks_5[0],stacks_5[0],stacks_5[0],stacks_5[0],stacks_5[0],stacks_5[0],stacks_5[0],stacks_5[0],stacks_5[1],stacks_5[1]]
            let test_getdate_stacks_5 =[stacks_5[1],stacks_5[1],stacks_5[0]]
            let getdate_level_5 = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON,cyfs.NDNAPILevel.NDN]
            let getdate_assert_5 = [true,true,true,true,true,true]

            let trans_stacks_5 = [stacks_5[0],stacks_5[0],stacks_5[0],stacks_5[0],stacks_5[0],stacks_5[0],stacks_5[0],stacks_5[0],stacks_5[1],stacks_5[1]]
            let test_trans_stacks_5 =[stacks_5[1],stacks_5[1],stacks_5[0]]
            let trans_level_5  = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON,cyfs.NDNAPILevel.NDN]
            let trans_assert_5 = [true,true,true,true,true,true]

            return {
                "stacks":stacks_5,
                "getdate_stacks": getdate_stacks_5, "test_getdate_stacks": test_getdate_stacks_5,"getdate_level" : getdate_level_5, "getdate_assert":getdate_assert_5,
                "trans_stacks" :  trans_stacks_5 , " test_trans_stacks" :  test_trans_stacks_5 , "trans_level" : trans_level_5 , "trans_assert" : trans_assert_5
                }

                
        case "dif_dev_dif_zone_dif_dec":
            let stacks_6 = [stack[1].fork_with_new_dec(DecId.DecIdE),stack[3].fork_with_new_dec(DecId.DecIdF)]
            let getdate_stacks_6 = [stacks_6[0],stacks_6[0],stacks_6[0],stacks_6[0],stacks_6[0],stacks_6[0],stacks_6[0],stacks_6[0],stacks_6[1],stacks_6[1]]
            let test_getdate_stacks_6 = [stacks_6[1],stacks_6[1],stacks_6[0]]
            let getdate_level_6 = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON,cyfs.NDNAPILevel.NDN]
            let getdate_assert_6 = [true,true,true,true,true,true]
            
            let trans_stacks_6 = [stacks_6[0],stacks_6[0],stacks_6[0],stacks_6[0],stacks_6[0],stacks_6[0],stacks_6[0],stacks_6[0],stacks_6[1],stacks_6[1]]
            let test_trans_stacks_6 = [stacks_6[1],stacks_6[1],stacks_6[0]]
            let trans_level_6  = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON,cyfs.NDNAPILevel.NDN]
            let trans_assert_6 = [true,true,true,true,true,true]

            return {
                "stacks":stacks_6,
                "getdate_stacks": getdate_stacks_6, "test_getdate_stacks": test_getdate_stacks_6,"getdate_level" : getdate_level_6, "getdate_assert":getdate_assert_6,
                "trans_stacks" :  trans_stacks_6 , " test_trans_stacks" :  test_trans_stacks_6 , "trans_level" : trans_level_6 , "trans_assert" : trans_assert_6
                }   
    }
}
//
async function trans_chunk_for_getdata(stack:cyfs.SharedCyfsStack[], filePath: string,inner_path:string, chunkSize: number, level:any[]):Promise<any>{
    console.info('开始chunk')
    console.info("filePath",filePath)
    console.info("inner_path",inner_path)
    //1. source 设备 publish_file 将文件存放到本地NDC 
    let owner = stack[0].local_device().desc().owner()!
    const file_resp_0 = (await stack[0].trans().publish_file({
        common: {
            level: level[0],
            flags: 0,
            dec_id: stack[1].dec_id,
            referer_object: [],
            target:stack[2].local_device_id().object_id

        },
        owner:owner,
        local_path: filePath ,
        chunk_size: chunkSize,     // chunk大小4M
        dirs: []
        }));

        if (file_resp_0.err) {
        console.info(file_resp_0);
        return { err: true, log: "transChunks publish_file failed" }
        }
        
    let object_map_id = cyfs.ObjectMapId.try_from_object_id(file_resp_0.unwrap().file_id).unwrap()   
    console.info("object_map_id: ",object_map_id)

    //2. source 设备 使用NOC 获取本地文件对象
    const file_obj_resp_0 = (await stack[3].non_service().get_object({
        common: {
            level: level[1],
            flags: 0,
            dec_id: stack[4].dec_id,
            target:stack[5].local_device_id().object_id    
        },
        object_id: object_map_id.object_id,
        inner_path:inner_path
        }))

        if (file_obj_resp_0.err) {
        return { err: true, log: "source noc get file object failed" }
        }
        console.info("get_object_file_id:",file_obj_resp_0.unwrap().object.object_id)
    
    let file_id_from_objectmap = cyfs.FileId.try_from_object_id(file_obj_resp_0.unwrap().object.object_id).unwrap()
    console.info("file_id_from_objectmap: ",file_id_from_objectmap)
    

    //3.从dir map 获取dir 对象
    let dir_from = await stack[6].util().build_dir_from_object_map({
        common: {flags: 0},
        object_map_id:object_map_id.object_id.clone(),
        dir_type: cyfs.BuildDirType.Zip,
    })

    let dir_id = cyfs.DirId.try_from_object_id(dir_from.unwrap().object_id).unwrap()
    console.info("dir_id: ",dir_id)


    const file_obj_resp: cyfs.NONGetObjectOutputResponse = file_obj_resp_0.unwrap();

    const [file, buf] = new cyfs.FileDecoder().raw_decode(file_obj_resp.object.object_raw).unwrap();

    let chunkIdList = file.body_expect().content().chunk_list.chunk_in_list!
    console.info("chunkIdList", chunkIdList)

    //CYFS_REQUEST_FLAG_CHUNK_LEVEL_ACL
    /*let bundle = new cyfs.ChunkBundle(chunkIdList,cyfs.ChunkBundleHashMethod.Serial)
    let hash = bundle.calc_hash_value()
    let chunks = cyfs.ChunkList.ChunkInBundle(bundle)
    cyfs.File.create(file_obj_resp_0.unwrap().object.object_id,file.,hash,chunks)*/



    //4. source 设备 将文件对象put 到 targrt 设备
    
    let put_file_object = (await stack[7].non_service().put_object({
        common: {
            level: level[2],
            dec_id:stack[8].dec_id,
            target: stack[9].local_device_id().object_id,
            flags: 0,
        },
        object: file_obj_resp_0.unwrap().object
        }))
        if (put_file_object.err) {
        console.info("put_file_object",put_file_object)
        }


    return [object_map_id,file_id_from_objectmap,dir_id,chunkIdList]
}

async function trans_file_for_task(stack:cyfs.SharedCyfsStack[], filePath: string,inner_path:string, chunkSize: number, level:any[]):Promise<any>{
    console.info('开始chunk')
    console.info("filePath",filePath)
    console.info("inner_path",inner_path)
    //1. source 设备 publish_file 将文件存放到本地NDC 
    let owner = stack[0].local_device().desc().owner()!
    const add_file = (await stack[0].trans().publish_file({
        common: {
            level: level[0],
            flags: 0,
            dec_id: stack[1].dec_id,
            referer_object: [],
            target:stack[2].local_device_id().object_id

        },
        owner:owner,
        local_path: filePath + inner_path,
        chunk_size: chunkSize,     // chunk大小4M
        dirs: []
        }));

        if (add_file.err) {
        console.info(add_file);
        return { err: true, log: "transChunks publish_file failed" }
        }
        
     
    //console.info("object_map_id: ",object_map_id)
    let file_id = add_file.unwrap().file_id
    //2. source 设备 使用NOC 获取本地文件对象
    const file_obj_resp_0 = (await stack[3].non_service().get_object({
        common: {
            level: level[1],
            flags: 0,
            dec_id: stack[4].dec_id,
            target:stack[5].local_device_id().object_id    
        },
        object_id: file_id,
        //inner_path:inner_path
        }))

        if (file_obj_resp_0.err) {
        return { err: true, log: "source noc get file object failed" }
        }
        console.info("get_object_file_id:",file_obj_resp_0.unwrap().object.object_id)
    
    //3. source 设备 将文件对象put 到 targrt 设备
    const file_obj_resp: cyfs.NONGetObjectOutputResponse = file_obj_resp_0.unwrap();
    let put_file_object = (await stack[7].non_service().put_object({
        common: {
            level: level[2],
            dec_id:stack[8].dec_id,
            target: stack[9].local_device_id().object_id,
            flags: 0,
        },
        object: file_obj_resp_0.unwrap().object
        }))
        if (put_file_object.err) {
        console.info("put_file_object",put_file_object)
        }
        const [file, buf] = new cyfs.FileDecoder().raw_decode(file_obj_resp.object.object_raw).unwrap();

    let chunkIdList = file.body_expect().content().chunk_list.chunk_in_list!
    console.info("chunkIdList", chunkIdList)

    return [file_id,chunkIdList]
}

async function get_data(stack:cyfs.SharedCyfsStack[],referer:cyfs.NDNDataRefererObject[],
                        path_handler:string,level:any,object_id:cyfs.ObjectId,flags:number=0,inner_path?:string){
    
    let req: cyfs.NDNGetDataOutputRequest = {

        common: {                                   
            level: cyfs.NDNAPILevel.NDN,// api级别
            dec_id: stack[0].dec_id, //这里可以模拟当前dec_id
            target: stack[1].local_device_id().object_id,
            // 需要处理数据的关联对象，主要用以chunk/file等+-
            referer_object: referer,
            //new cyfs.NDNDataRefererObject(target,object_id,innerpath), 
            flags: flags,
            req_path: path_handler//如果没有DecId，那么就当当前decid处理
        },
        // 目前只支持ChunkId/FileId/DirId
        object_id: object_id,
        inner_path:inner_path,
        //range:range
        
    }
    let resp = await stack[2].ndn_service().get_data(req)
    return resp
}

async function tarns_task(stack:cyfs.SharedCyfsStack[],referer:cyfs.NDNDataRefererObject[],path_handler:string,level:any,object_id:cyfs.ObjectId,path:string,flags:number,timeout:number){

        let create_task = (await stack[0].trans().create_task({
            common: {
                level: level[0],
                flags: flags,
                dec_id: stack[1].dec_id,
                target: stack[2].local_device_id().object_id,
                //referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)]
                referer_object: referer,
                req_path:path_handler
            },
            //不支持DirId,支持ChunkId/FileId
            object_id: object_id,
            local_path: path,
            device_list: [stack[3].local_device_id()],
            auto_start: true
        })).unwrap()
        console.log("create_task_id",JSON.stringify(create_task.task_id))
        let sleepTime = 50;
        console.log("create_task_id",JSON.stringify(create_task.task_id))
    
        //target 设备 get_task_state 检查下载状态
        let check: Promise<{ err: boolean, log: string, fileId?: string}> = new Promise(async (v) => {
            setTimeout(() => {
                console.info(`下载文件超时`)
                v({ err: true, log: `下载文件超时：${object_id}` })
            }, timeout)
            while (true) {
                console.log(`savePath: ${path}`);
                const resp = (await stack[4].trans().get_task_state({
                    common: {
                        level: cyfs.NDNAPILevel.NDC,
                        flags: 0,
                        dec_id: stack[5].dec_id,
                        target: stack[6].local_device_id().object_id,
                        req_path: "",
                        referer_object: []

                    },
                    task_id: create_task.task_id
                })).unwrap();
                console.log("get task status", JSON.stringify(resp.state));
                if (resp.state.state === cyfs.TransTaskState.Finished) {
                    console.log("download task finished")
                    break;
                }
                if (sleepTime > 2000) {
                    await cyfs.sleep(2000);
                } else {
                    await cyfs.sleep(sleepTime);
                    sleepTime = sleepTime * 2;
                }

            }
            v({ err: false, log: `下载文件成功：${object_id}` })
        })
        return create_task   
}

async function clean_test_data(source:cyfs.SharedCyfsStack,target:cyfs.SharedCyfsStack,obj_id:cyfs.ObjectId,root_state_path:string,test_file_path:string){
    //clear test object 
    let delete_sourceobject_result = (await source.non_service().delete_object(
        {
            common: {
                level: cyfs.NONAPILevel.NOC,
                flags: 0
            },
            object_id: obj_id
        }))
    console.info("delete_object_result",JSON.stringify(delete_sourceobject_result))

    let delete_targetobject_result = (await target.non_service().delete_object(
        {
            common: {
            level: cyfs.NONAPILevel.NOC,
            flags: 0
        },
        object_id: obj_id
        }))
    console.info("delete_targetobject_result",JSON.stringify(delete_targetobject_result))
    
    //clear test data
    let delete_sourcedata_result = (await source.ndn_service().delete_data(
        {
            common: {
                level: cyfs.NDNAPILevel.NDC,
                referer_object:[],
                flags: 0
            },
            object_id: obj_id
        })).err;
    console.info("delete_sourcedata_result",JSON.stringify(delete_sourcedata_result))
    
    let delete_targetdata_result = (await target.ndn_service().delete_data(
        {
            common: {
                level: cyfs.NDNAPILevel.NDC,
                referer_object:[],
                flags: 0
            },
            object_id: obj_id
        }));
    console.info("delete_targetdata_result",JSON.stringify(delete_targetdata_result))
    
    //clear acl conf
    await source.root_state_meta_stub(undefined,undefined).clear_access()
    await target.root_state_meta_stub(undefined,undefined).clear_access()

    //clear root_state conf
    let env_acc:cyfs.RootStateOpEnvAccess = {
        path:root_state_path,
        access:cyfs.AccessPermissions.Full 
        }
    let stub_source = source.root_state_stub(undefined,undefined)
    let stub_target = target.root_state_stub(undefined,undefined)

    let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
    let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()

    console.info("remove_with_path", await op_env_stub_source.remove_with_path(root_state_path))
    console.info("remove_with_path", await op_env_stub_target.remove_with_path(root_state_path))
    
    //clear test file path
    console.log("clear_file_path",test_file_path)
    fs.removeSync(test_file_path)

}

async function insert_object_map(type:string,path:string,key:any,PathOpEnv:cyfs.PathOpEnvStub){
    //将对象id挂在objet_map上 &&
    let obj  = cyfs.TextObject.create(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap(),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
    let obj_id = obj.desc().object_id();
    switch(type){
        case "Map":   
            console.info(`#create_new_with_path_map ${JSON.stringify(await PathOpEnv.create_new_with_path(path,cyfs.ObjectMapSimpleContentType.Map))}`)
            console.info(`#remove_with_path  ${JSON.stringify(await PathOpEnv.remove_with_path(path))}`)
            console.info(`#insert_with_path_result:${JSON.stringify(await PathOpEnv.insert_with_path(path, key))}`)

            console.info(`#insert_with_path_result:${JSON.stringify(await PathOpEnv.insert_with_path(path, obj_id))}`)
            console.info(`#before update_result",${JSON.stringify(await PathOpEnv.update())}`)
            let before_path_map_1 = await PathOpEnv.update()
            let before_root_1 = before_path_map_1.unwrap().root
            let before_dec_root_1 = before_path_map_1.unwrap().dec_root
            console.info(`#set_with_path_result:${JSON.stringify(await PathOpEnv.set_with_path(path, key))}`)
            let after_path_map_1 = await PathOpEnv.update()
            let after_root_1 = after_path_map_1.unwrap().root
            let after_dec_root_1 = after_path_map_1.unwrap().dec_root
            return [before_root_1,before_dec_root_1,after_root_1,after_dec_root_1]
        case "Set":
            console.info(`#create_new_with_path_Set ${JSON.stringify(await PathOpEnv.create_new_with_path(path,cyfs.ObjectMapSimpleContentType.Set))}`)
            console.info(`#remove_with_path  ${JSON.stringify(await PathOpEnv.remove_with_path(path))}`)
            console.info(`#insert_with_path_result:${JSON.stringify(await PathOpEnv.insert_with_path(path, key))}`)
            console.info(`#insert_with_path_result:${JSON.stringify(await PathOpEnv.insert_with_path(path, obj_id))}`)
            console.info(`#before update_result",${JSON.stringify(await PathOpEnv.update())}`)
            let before_path_map_2 = await PathOpEnv.update()
            let before_root_2  = before_path_map_2.unwrap().root
            let before_dec_root_2  = before_path_map_2 .unwrap().dec_root
            console.info(`#set_with_path_result:${JSON.stringify(await PathOpEnv.set_with_path(path, key))}`)
            let after_path_map_2 = await PathOpEnv.update()
            let after_root_2 = after_path_map_2.unwrap().root
            let after_dec_root_2 = after_path_map_2.unwrap().dec_root
            return [before_root_2,before_dec_root_2,after_root_2,after_dec_root_2]
    }
    
}

/*----------------------------------------------------------------------------------------------------------------------------------------------------------*/

describe("#NDN权限测试,objectmap_inner_path ",function(){
    this.timeout(0);
    this.beforeAll(async function () {
        //await ZoneSimulator.init(false,false,' Console',"http");
        await ZoneSimulator.init(false,false,' RDP-Tcp',"http");
        zone1ood = ZoneSimulator.zone1_ood_stack
        zone1device1 =ZoneSimulator.zone1_device1_stack
        zone1device2 = ZoneSimulator.zone1_device2_stack

        zone2ood = ZoneSimulator.zone2_ood_stack
        zone2device1 = ZoneSimulator.zone2_device1_stack
        zone2device2 = ZoneSimulator.zone2_device2_stack
    })
    this.afterAll(async () => {
        console.info(`#########用例执行完成`);
        ZoneSimulator.clearZoneSimulator();
        ZoneSimulator.stopZoneSimulator();
        process.exit(0)
    })

    describe("#NDN权限测试,objectmap_inner_path",function (){
        describe("#NDN权限测试,objectmap_inner_path,getdata",function (){                 
            it("#NDN权限测试,objectmap_inner_path,getdata,chunk目标对象",async()=>{ 
                
                console.info("start")
                //遍历六种stack连接情况
                for(let n=0; n < devices.length; n++){
                    let para = 
                    {
                        "acl_path":"/test/api/test/",
                        "path":{
                        "en_fileName":RandomGenerator.string(10),
                        "en_filePath":path.join(__dirname, "./chunk_trans/source/"),
                        "cn_fileName":RandomGenerator.string(0,10,0), 
                        "cn_filePath":path.join(__dirname, `./chunk_trans/source/${RandomGenerator.string(0,10,0)}/${RandomGenerator.string(0,10,0)}/`)},
                        "chunkSize" : 4 * 1024 * 1024,
                        "timeout" : 600 * 1000,
                        "root_path" : "/123/test/",
                        "chunkNumber" : 10,
                        "flags": cyfs.CYFS_REQUEST_FLAG_CHUNK_LEVEL_ACL
                    }
                    console.info("n++", n)
                    //初始化stack
                    console.info("devices_type: ",devices[n])
                    
                    let stack_res : stack_ty|undefined = await stacks(devices[n],[zone1ood,zone1device1,zone2ood,zone2device1])
                    
                    let source = stack_res!["stacks"][0] as cyfs.SharedCyfsStack
                    let target = stack_res!["stacks"][1] as cyfs.SharedCyfsStack
                    console.info("stacks-------")
                    let getdata_stacks : cyfs.SharedCyfsStack[] = stack_res!["getdate_stacks"] as cyfs.SharedCyfsStack[]
                    let test_getdate_stacks : cyfs.SharedCyfsStack[] = stack_res!["test_getdate_stacks"] as cyfs.SharedCyfsStack[]
                    let getdata_level: level_ty[] = stack_res!["getdate_level"] as level_ty[]
                    let getdate_assert: boolean[] = stack_res!["getdate_assert"] as boolean[]
                    //let tans_stacks : cyfs.SharedCyfsStack[] = stack_res!["tans_stacks"] as cyfs.SharedCyfsStack[]
                   // let test_getdate_stacks: cyfs.SharedCyfsStack[] = stack_res!["test_getdate_stacks"] as cyfs.SharedCyfsStack[]
                    //let test_trans_stacks: cyfs.SharedCyfsStack[] = stack_res!["test_trans_stacks"] as cyfs.SharedCyfsStack[]
                    //cyfs.sleep(10)
                    
                    //生成测试文件
                    await RandomGenerator.createRandomFile(para.path.cn_filePath, para.path.cn_fileName, 1 * 1024 * 1024);
                    //生成path_handler 
                    let path_handler = new cyfs.RequestGlobalStatePath(target.dec_id, para.acl_path).toString()
                   
                    //初始化数据
                    let res= (await trans_chunk_for_getdata(getdata_stacks,para.path.cn_filePath,"/" + para.path.cn_fileName,para.chunkSize,getdata_level))
                    //[object_map_id,file_id_from_objectmap,dir_id,chunkIdList]               
                    let object_map_id = res[0]
                    let file_id_from_objectmap = res[1]
                    let dir_id = res[2]
                    let chunkIdList = res[3]
 

                    for(let m = 0; m<= AccPermissions.length; m++){
                        //遍历rmeta ACL权限
                        let acl_res: cyfs.PathOpEnvStub[]= (await r_meta_acc_acl(source,target,para.acl_path,AccPermissions[m]))!
                        let stub_source:cyfs.PathOpEnvStub= acl_res[0]  
                        //从target设备get 对象数据
                        console.log("chunkIdList",chunkIdList)
                        let chunkRecvPromise: Array<any> = []
                        for (let i = 0; i < chunkIdList!.length && i < para.chunkNumber; i++) {
                            console.log("chunkIdList_i_ ", i)
                            //chunkRecvPromise.push(new Promise(async (v) => {                     
                            let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                            console.info(`开始传输chunk:${chunkId},${buff}`)
                            
                            //将chunkid对象id挂在objet_map上
                            let obeject_map_res = await insert_object_map("Map",para.acl_path,chunkId.calculate_id(),stub_source)

                            //调用NDN get_data接口
                            let resp = await get_data(
                                test_getdate_stacks,
                                [],
                                path_handler,
                                getdata_level[3],
                                chunkId.calculate_id(),
                                0
                                )
                            

                            console.info(`${chunkId} 下载结果：${resp}`)

                            //六种ACL情况下的断言
                            assert(!resp.err == getdate_assert[m],`${chunkId.calculate_id()} get_data 失败`)
                            
                            //console.info(`下载chunk 成功： ${JSON.stringify(resp)}`)
                        // v({ err: false, chunkId: chunkId.calculate_id().to_base_58() })
                            }
                        
                        console.info("start download")
                        let download = []
                        //for (let i in chunkRecvPromise) {
                            //let result = await chunkRecvPromise[i]
                            //if (result.err) {
                            //    return { err: result.err, log: result.log }}
                            //download.push(result)                        
                        //}
                        //清理数据
                        //await clean_test_data(source,target,res[1],para.acl_path,para.path.filepath + "/" +para.path.fileName)

                        //return { err: false, log: `chunk 下载成功` };
                        
                        //return { err: false, log: `chunk 下载成功`, download };
                    }
                        }
            })

            it("#NDN权限测试,objectmap_inner_path,get_data,chunk目标对象,来源对象file",async()=>{
                
                console.info("start")
                //遍历六种情况
                for(let n=0; n < devices.length; n++){
                    let para = 
                    {
                        "acl_path":"/test/api/test/",
                        "path":{
                        "en_fileName":RandomGenerator.string(10),
                        "en_filePath":path.join(__dirname, "./chunk_trans/source/"),
                        "cn_fileName":RandomGenerator.string(0,10,0), 
                        "cn_filePath":path.join(__dirname, `./chunk_trans/${RandomGenerator.string(0,10,0)}/${RandomGenerator.string(0,10,0)}/`)},
                        "chunkSize" : 4 * 1024 * 1024,
                        "timeout" : 600 * 1000,
                        "root_path" : "/123/test/",
                        "chunkNumber" : 10,
                        "flags":0 
                    }
                    console.info("n++", n)
                    //初始化stack
                    console.info("devices_type: ",devices[n])
                    
                    let stack_res : stack_ty|undefined = await stacks(devices[n],[zone1ood,zone1device1,zone2ood,zone2device1])

                    let source : cyfs.SharedCyfsStack = stack_res!["stacks"][0] as cyfs.SharedCyfsStack
                    let target : cyfs.SharedCyfsStack = stack_res!["stacks"][1] as cyfs.SharedCyfsStack
                    let getdata_stacks : cyfs.SharedCyfsStack[] = stack_res!["getdate_stacks"] as cyfs.SharedCyfsStack[]
                    let test_getdate_stacks : cyfs.SharedCyfsStack[] = stack_res!["test_getdate_stacks"] as cyfs.SharedCyfsStack[]
                    let getdata_level: level_ty[] = stack_res!["getdate_level"] as level_ty[]
                    let getdate_assert: boolean[] = stack_res!["getdate_assert"] as boolean[]
                    cyfs.sleep(10)
                   
                    //生成测试文件
                    await RandomGenerator.createRandomFile(para.path.cn_filePath, para.path.cn_fileName, 1 * 1024 * 1024);
                    //生成path_handler 
                    let path_handler = new cyfs.RequestGlobalStatePath(target.dec_id, para.acl_path).toString()

                                        
                    //初始化数据
                    let res= (await trans_chunk_for_getdata(getdata_stacks,para.path.cn_filePath,"/" + para.path.cn_fileName,para.chunkSize,getdata_level))
                    //[object_map_id,file_id_from_objectmap,dir_id,chunkIdList]               
                    let object_map_id = res[0]
                    let file_id_from_objectmap = res[1]
                    let dir_id = res[2]
                    let chunkIdList = res[3]
                    
                    for(let m = 0; m<= AccPermissions.length; m++){
                        //遍历rmeta ACL权限
                        let acl_res: cyfs.PathOpEnvStub[]= (await r_meta_acc_acl(source,target,para.acl_path,AccPermissions[m]))!
                        let stub_source:cyfs.PathOpEnvStub= acl_res[0]  
                        //从target设备get 对象数据
                        console.log("chunkIdList",chunkIdList)
                        let chunkRecvPromise: Array<any> = []
                        for (let i = 0; i < chunkIdList!.length && i < para.chunkNumber; i++) {
                            console.log("chunkIdList_i_ ", i)
                            //chunkRecvPromise.push(new Promise(async (v) => {                     
                            let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                            console.info(`开始传输chunk:${chunkId},${buff}`)
                            
                            //将chunkid对象id挂在objet_map上
                            let obeject_map_res = await insert_object_map("Map",para.acl_path,chunkId.calculate_id(),stub_source)
                      
                            //调用NDN get_data接口
                            let resp = await get_data(
                                test_getdate_stacks,
                                [new cyfs.NDNDataRefererObject(undefined,file_id_from_objectmap.object_id,"/" + para.path.cn_fileName)],
                                path_handler,
                                cyfs.NDNAPILevel.NDN,
                                chunkId.calculate_id(),
                                0)

                            console.info(`${chunkId} 下载结果：${resp}`)
                            //if (resp.err) {
                            //    v({ err: true, log: `ndn_service get_data failed` })
                            //}
                            //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                            //console.info(`下载chunk 成功： ${JSON.stringify(resp)}`)
                        // v({ err: false, chunkId: chunkId.calculate_id().to_base_58() })
                            }
                        
                        console.info("start download")
                        let download = []
                        //for (let i in chunkRecvPromise) {
                            //let result = await chunkRecvPromise[i]
                            //if (result.err) {
                            //    return { err: result.err, log: result.log }}
                            //download.push(result)                        
                        //}
                        //清理数据
                        //await clean_test_data(source,target,res[1],para.acl_path,para.path.filepath + "/" +para.path.fileName)

                        //return { err: false, log: `chunk 下载成功` };
                        
                        //return { err: false, log: `chunk 下载成功`, download };
                        }
                    }
                })
            it.skip("#NDN权限测试,objectmap_inner_path,get_data,chunk目标对象,来源对象dir",async()=>{
                
                    console.info("start")
                    //遍历六种情况
                    for(let n=0; n < devices.length; n++){
                        let para = 
                        {
                            "acl_path":"/test/api/test/",
                            "path":{
                            "en_fileName":RandomGenerator.string(10),
                            "en_filePath":path.join(__dirname, "./chunk_trans/source/"),
                            "cn_fileName":RandomGenerator.string(0,10,0), 
                            "cn_filePath":path.join(__dirname, `./chunk_trans/${RandomGenerator.string(0,10,0)}/${RandomGenerator.string(0,10,0)}/`)},
                            "chunkSize" : 4 * 1024 * 1024,
                            "timeout" : 600 * 1000,
                            "root_path" : "/123/test/",
                            "chunkNumber" : 10,
                            "flags":0 
                        }
                        console.info("n++", n)
                        //初始化stack
                        console.info("devices_type: ",devices[n])
                        
                        let stack_res : stack_ty|undefined = await stacks(devices[n],[zone1ood,zone1device1,zone2ood,zone2device1])
                        let source : cyfs.SharedCyfsStack = stack_res!["stacks"][0] as cyfs.SharedCyfsStack
                        let target : cyfs.SharedCyfsStack = stack_res!["stacks"][1] as cyfs.SharedCyfsStack
                        let getdata_stacks : cyfs.SharedCyfsStack[] = stack_res!["getdate_stacks"] as cyfs.SharedCyfsStack[]                       
                        let test_getdata_stacks: cyfs.SharedCyfsStack[] = stack_res!["test_getdate_stacks"] as cyfs.SharedCyfsStack[]
                        let getdata_level: level_ty[] = stack_res!["getdate_level"] as level_ty[]
                        let getdate_assert: boolean[] = stack_res!["getdate_assert"] as boolean[]
                        cyfs.sleep(10)
                       
                        //生成测试文件
                        await RandomGenerator.createRandomFile(para.path.cn_filePath, para.path.cn_fileName, 1 * 1024 * 1024);
                        //生成path_handler 
                        let path_handler = new cyfs.RequestGlobalStatePath(target.dec_id, para.acl_path).toString()
    
                        //初始化数据
                        let res= (await trans_chunk_for_getdata(getdata_stacks,para.path.cn_filePath,"/" + para.path.cn_fileName,para.chunkSize,getdata_level))
                        //[object_map_id,file_id_from_objectmap,dir_id,chunkIdList]               
                        let object_map_id = res[0]
                        let file_id_from_objectmap = res[1]
                        let dir_id = res[2]
                        let chunkIdList = res[3]
 

                    for(let m = 0; m<= AccPermissions.length; m++){
                        //遍历rmeta ACL权限
                        let acl_res: cyfs.PathOpEnvStub[]= (await r_meta_acc_acl(source,target,para.acl_path,AccPermissions[m]))!
                        let stub_source:cyfs.PathOpEnvStub= acl_res[0]  
                        //从target设备get 对象数据
                        console.log("chunkIdList",chunkIdList)
                        let chunkRecvPromise: Array<any> = []
                        for (let i = 0; i < chunkIdList!.length && i < para.chunkNumber; i++) {
                            console.log("chunkIdList_i_ ", i)
                            //chunkRecvPromise.push(new Promise(async (v) => {                     
                            let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                            console.info(`开始传输chunk:${chunkId},${buff}`)
                            
                            //将chunkid对象id挂在objet_map上
                            let obeject_map_res = await insert_object_map("Map",para.acl_path,chunkId.calculate_id(),stub_source)
                            
    
                            //调用NDN get_data接口
                            let resp = await get_data([source,source,source],[],path_handler,cyfs.NDNAPILevel.NDN,chunkId.calculate_id(),0)
    
                            console.info(`${chunkId} 下载结果：${resp}`)
                            //if (resp.err) {
                            //    v({ err: true, log: `ndn_service get_data failed` })
                            //}
                            //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                            //console.info(`下载chunk 成功： ${JSON.stringify(resp)}`)
                           // v({ err: false, chunkId: chunkId.calculate_id().to_base_58() })
                            }
                        
                            console.info("start download")
                            let download = []
                            //for (let i in chunkRecvPromise) {
                                //let result = await chunkRecvPromise[i]
                                //if (result.err) {
                                //    return { err: result.err, log: result.log }}
                                //download.push(result)                        
                            //}
                            //清理数据
                            //await clean_test_data(source,target,res[1],para.acl_path,para.path.filepath + "/" +para.path.fileName)
        
                            //return { err: false, log: `chunk 下载成功` };
                            
                        }    //return { err: false, log: `chunk 下载成功`, download };
                    }
                })
            it("#NDN权限测试,objectmap_inner_path,get_data,chunk目标对象,来源对象objectmap_inner_path",async()=>{
            
                console.info("start")
                //遍历六种情况
                for(let n=0; n < devices.length; n++){
                    let para = 
                    {
                        "acl_path":"/test/api/test/",
                        "path":{
                        "en_fileName":RandomGenerator.string(10),
                        "en_filePath":path.join(__dirname, "./chunk_trans/source/"),
                        "cn_fileName":RandomGenerator.string(0,10,0), 
                        "cn_filePath":path.join(__dirname, `./chunk_trans/${RandomGenerator.string(0,10,0)}/${RandomGenerator.string(0,10,0)}/`)},
                        "chunkSize" : 4 * 1024 * 1024,
                        "timeout" : 600 * 1000,
                        "root_path" : "/123/test/",
                        "chunkNumber" : 10,
                        "flags":0 
                    }
                    console.info("n++", n)
                    //初始化stack
                    console.info("devices_type: ",devices[n])
                    
                    let stack_res : stack_ty|undefined = await stacks(devices[n],[zone1ood,zone1device1,zone2ood,zone2device1])


                    let source : cyfs.SharedCyfsStack = stack_res!["stacks"][0] as cyfs.SharedCyfsStack
                    let target : cyfs.SharedCyfsStack = stack_res!["stacks"][1] as cyfs.SharedCyfsStack
                    let getdata_stacks : cyfs.SharedCyfsStack[] = stack_res!["getdate_stacks"] as cyfs.SharedCyfsStack[]
                    let test_getdate_stacks : cyfs.SharedCyfsStack[] = stack_res!["test_getdate_stacks"] as cyfs.SharedCyfsStack[]
                    let getdata_level: level_ty[] = stack_res!["getdate_level"] as level_ty[]
                    let getdate_assert: boolean[] = stack_res!["getdate_assert"] as boolean[]
                    cyfs.sleep(10)
                    
                    //生成测试文件
                    await RandomGenerator.createRandomFile(para.path.cn_filePath, para.path.cn_fileName, 1 * 1024 * 1024);
                    //生成path_handler 
                    let path_handler = new cyfs.RequestGlobalStatePath(target.dec_id, para.acl_path).toString()

                    //初始化数据
                    let res= (await trans_chunk_for_getdata(getdata_stacks,para.path.cn_filePath,"/" + para.path.cn_fileName,para.chunkSize,getdata_level))
                    //[object_map_id,file_id_from_objectmap,dir_id,chunkIdList]               
                    let object_map_id = res[0]
                    let file_id_from_objectmap = res[1]
                    let dir_id = res[2]
                    let chunkIdList = res[3]
                    
                    for(let m = 0; m<= AccPermissions.length; m++){
                        //遍历rmeta ACL权限
                        let acl_res: cyfs.PathOpEnvStub[]= (await r_meta_acc_acl(source,target,para.acl_path,AccPermissions[m]))!
                        let stub_source:cyfs.PathOpEnvStub= acl_res[0]  
                        //从target设备get 对象数据
                        console.log("chunkIdList",chunkIdList)
                        let chunkRecvPromise: Array<any> = []
                        for (let i = 0; i < chunkIdList!.length && i < para.chunkNumber; i++) {
                            console.log("chunkIdList_i_ ", i)
                            //chunkRecvPromise.push(new Promise(async (v) => {                     
                            let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                            console.info(`开始传输chunk:${chunkId},${buff}`)
                            
                            //将chunkid对象id挂在objet_map上
                            let obeject_map_res = await insert_object_map("Map",para.acl_path,chunkId.calculate_id(),stub_source)

                            //调用NDN get_data接口
                            let resp = await get_data(
                                [source,source,source],
                                [new cyfs.NDNDataRefererObject(undefined,object_map_id.object_id,"/" + para.path.cn_fileName)],
                                path_handler,
                                cyfs.NDNAPILevel.NDN,
                                chunkId.calculate_id(),
                                0,
                                path_handler)

                            console.info(`${chunkId} 下载结果：${resp}`)
                            //if (resp.err) {
                            //    v({ err: true, log: `ndn_service get_data failed` })
                            //}
                            //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                            //console.info(`下载chunk 成功： ${JSON.stringify(resp)}`)
                            // v({ err: false, chunkId: chunkId.calculate_id().to_base_58() })
                        }
                        
                            console.info("start download")
                            let download = []
                            //for (let i in chunkRecvPromise) {
                                //let result = await chunkRecvPromise[i]
                                //if (result.err) {
                                //    return { err: result.err, log: result.log }}
                                //download.push(result)                        
                            //}
                            //清理数据
                            //await clean_test_data(source,target,res[1],para.acl_path,para.path.filepath + "/" +para.path.fileName)

                            //return { err: false, log: `chunk 下载成功` };
                            
                            //return { err: false, log: `chunk 下载成功`, download };
                    }
                }
            })
            it("#NDN权限测试,objectmap_inner_path,get_data,File目标对象",async()=>{
                                    
                console.info("start")
                //遍历六种情况
                for(let n=0; n < devices.length; n++){
                    let para = 
                    {
                        "acl_path":"/test/api/test/",
                        "path":{
                        "en_fileName":RandomGenerator.string(10),
                        "en_filePath":path.join(__dirname, "./chunk_trans/source/"),
                        "cn_fileName":RandomGenerator.string(0,10,0), 
                        "cn_filePath":path.join(__dirname, `./chunk_trans/${RandomGenerator.string(0,10,0)}/${RandomGenerator.string(0,10,0)}/`)},
                        "chunkSize" : 4 * 1024 * 1024,
                        "timeout" : 600 * 1000,
                        "root_path" : "/123/test/",
                        "chunkNumber" : 10,
                        "flags":0 
                    }
                    console.info("n++", n)
                    //初始化stack
                    console.info("devices_type: ",devices[n])
                    
                    let stack_res : stack_ty|undefined = await stacks(devices[n],[zone1ood,zone1device1,zone2ood,zone2device1])


                    let source : cyfs.SharedCyfsStack = stack_res!["stacks"][0] as cyfs.SharedCyfsStack
                    let target : cyfs.SharedCyfsStack = stack_res!["stacks"][1] as cyfs.SharedCyfsStack
                    let getdata_stacks : cyfs.SharedCyfsStack[] = stack_res!["getdate_stacks"] as cyfs.SharedCyfsStack[]
                    let test_getdate_stacks : cyfs.SharedCyfsStack[] = stack_res!["test_getdate_stacks"] as cyfs.SharedCyfsStack[]
                    let getdata_level: level_ty[] = stack_res!["getdate_level"] as level_ty[]
                    let getdate_assert: boolean[] = stack_res!["getdate_assert"] as boolean[]
                    cyfs.sleep(10)
                    
                    //生成测试文件
                    await RandomGenerator.createRandomFile(para.path.cn_filePath, para.path.cn_fileName, 1 * 1024 * 1024);
                    //生成path_handler 
                    let path_handler = new cyfs.RequestGlobalStatePath(target.dec_id, para.acl_path).toString()

                    //初始化数据
                    let res= (await trans_chunk_for_getdata(getdata_stacks,para.path.cn_filePath,"/" + para.path.cn_fileName,para.chunkSize,getdata_level))
                    //[object_map_id,file_id_from_objectmap,dir_id,chunkIdList]               
                    let object_map_id = res[0]
                    let file_id_from_objectmap = res[1]
                    let dir_id = res[2]
                    let chunkIdList = res[3]
                    
                    for(let m = 0; m<= AccPermissions.length; m++){
                        //遍历rmeta ACL权限
                        let acl_res: cyfs.PathOpEnvStub[]= (await r_meta_acc_acl(source,target,para.acl_path,AccPermissions[m]))!
                        let stub_source:cyfs.PathOpEnvStub= acl_res[0]  
                        //从target设备get 对象数据
                        console.log("chunkIdList",chunkIdList)
                        let chunkRecvPromise: Array<any> = []
                        for (let i = 0; i < chunkIdList!.length && i < para.chunkNumber; i++) {
                            console.log("chunkIdList_i_ ", i)
                            //chunkRecvPromise.push(new Promise(async (v) => {                     
                            let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                            console.info(`开始传输chunk:${chunkId},${buff}`)
                            
                            //将chunkid对象id挂在objet_map上
                            let obeject_map_res = await insert_object_map("Map",para.acl_path,chunkId.calculate_id(),stub_source)

                            //调用NDN get_data接口
                            let resp = await get_data(
                                [source,source,source],
                                [],
                                path_handler,
                                cyfs.NDNAPILevel.NDN,
                                file_id_from_objectmap.objcet_id,
                                0)

                            console.info(`${chunkId} 下载结果：${resp}`)
                            //if (resp.err) {
                            //    v({ err: true, log: `ndn_service get_data failed` })
                            //}
                            //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                            //console.info(`下载chunk 成功： ${JSON.stringify(resp)}`)
                        // v({ err: false, chunkId: chunkId.calculate_id().to_base_58() })
                            }
                        
                        console.info("start download")
                        let download = []
                        //for (let i in chunkRecvPromise) {
                            //let result = await chunkRecvPromise[i]
                            //if (result.err) {
                            //    return { err: result.err, log: result.log }}
                            //download.push(result)                        
                        //}
                        //清理数据
                        //await clean_test_data(source,target,res[1],para.acl_path,para.path.filepath + "/" +para.path.fileName)

                        //return { err: false, log: `chunk 下载成功` };
                        
                    }    //return { err: false, log: `chunk 下载成功`, download };
                }
                })
            it("#NDN权限测试,objectmap_inner_path,get_data,File目标对象,来源对象objectmap_inner_path",async()=>{
                                   
                console.info("start")
                //遍历六种情况
                for(let n=0; n < devices.length; n++){
                    let para = 
                    {
                        "acl_path":"/test/api/test/",
                        "path":{
                        "en_fileName":RandomGenerator.string(10),
                        "en_filePath":path.join(__dirname, "./chunk_trans/source/"),
                        "cn_fileName":RandomGenerator.string(0,10,0), 
                        "cn_filePath":path.join(__dirname, `./chunk_trans/${RandomGenerator.string(0,10,0)}/${RandomGenerator.string(0,10,0)}/`)},
                        "chunkSize" : 4 * 1024 * 1024,
                        "timeout" : 600 * 1000,
                        "root_path" : "/123/test/",
                        "chunkNumber" : 10,
                        "flags":0 
                    }
                    //初始化stack
                    console.info("devices_type: ",devices[n])
                    
                    let stack_res : stack_ty|undefined = await stacks(devices[n],[zone1ood,zone1device1,zone2ood,zone2device1])


                    let source : cyfs.SharedCyfsStack = stack_res!["stacks"][0] as cyfs.SharedCyfsStack
                    let target : cyfs.SharedCyfsStack = stack_res!["stacks"][1] as cyfs.SharedCyfsStack
                    let getdata_stacks : cyfs.SharedCyfsStack[] = stack_res!["getdate_stacks"] as cyfs.SharedCyfsStack[]
                    let test_getdate_stacks : cyfs.SharedCyfsStack[] = stack_res!["test_getdate_stacks"] as cyfs.SharedCyfsStack[]
                    let getdata_level: level_ty[] = stack_res!["getdate_level"] as level_ty[]
                    let getdate_assert: boolean[] = stack_res!["getdate_assert"] as boolean[]
                    cyfs.sleep(10)
                    
                    //生成测试文件
                    await RandomGenerator.createRandomFile(para.path.cn_filePath, para.path.cn_fileName, 1 * 1024 * 1024);
                    //生成path_handler 
                    let path_handler = new cyfs.RequestGlobalStatePath(target.dec_id, para.acl_path).toString()

                    //初始化数据
                    let res= (await trans_chunk_for_getdata(getdata_stacks,para.path.cn_filePath,"/" + para.path.cn_fileName,para.chunkSize,getdata_level))
                    //[object_map_id,file_id_from_objectmap,dir_id,chunkIdList]               
                    let object_map_id = res[0]
                    let file_id_from_objectmap = res[1]
                    let dir_id = res[2]
                    let chunkIdList = res[3]
                    
                    for(let m = 0; m<= AccPermissions.length; m++){
                        //遍历rmeta ACL权限
                        let acl_res: cyfs.PathOpEnvStub[]= (await r_meta_acc_acl(source,target,para.acl_path,AccPermissions[m]))!
                        let stub_source:cyfs.PathOpEnvStub= acl_res[0]  
                        //从target设备get 对象数据
                        console.log("chunkIdList",chunkIdList)
                        let chunkRecvPromise: Array<any> = []
                        for (let i = 0; i < chunkIdList!.length && i < para.chunkNumber; i++) {
                            console.log("chunkIdList_i_ ", i)
                            //chunkRecvPromise.push(new Promise(async (v) => {                     
                            let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                            console.info(`开始传输chunk:${chunkId},${buff}`)
                            
                            //将chunkid对象id挂在objet_map上
                            let obeject_map_res = await insert_object_map("Map",para.acl_path,chunkId.calculate_id(),stub_source)

                            //调用NDN get_data接口
                            let resp = await get_data(
                                [source,source,source],
                                [],
                                path_handler,
                                cyfs.NDNAPILevel.NDN,
                                file_id_from_objectmap.objcet_id,
                                0,
                                path_handler)

                            console.info(`${chunkId} 下载结果：${resp}`)
                            //if (resp.err) {
                            //    v({ err: true, log: `ndn_service get_data failed` })
                            //}
                            //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                            //console.info(`下载chunk 成功： ${JSON.stringify(resp)}`)
                        // v({ err: false, chunkId: chunkId.calculate_id().to_base_58() })
                            }
                        
                        console.info("start download")
                        let download = []
                        //for (let i in chunkRecvPromise) {
                            //let result = await chunkRecvPromise[i]
                            //if (result.err) {
                            //    return { err: result.err, log: result.log }}
                            //download.push(result)                        
                        //}
                        //清理数据
                        //await clean_test_data(source,target,res[1],para.acl_path,para.path.filepath + "/" +para.path.fileName)

                        //return { err: false, log: `chunk 下载成功` };
                        
                        //return { err: false, log: `chunk 下载成功`, download };
                
                    }
                }    
                })
            it("#NDN权限测试,objectmap_inner_path,get_data,objectmap_inner_path目标对象",async()=>{
                                    
                console.info("start")
                //遍历六种情况
                for(let n=0; n < devices.length; n++){
                    let para = 
                    {
                        "acl_path":"/test/api/test/",
                        "path":{
                        "en_fileName":RandomGenerator.string(10),
                        "en_filePath":path.join(__dirname, "./chunk_trans/source/"),
                        "cn_fileName":RandomGenerator.string(0,10,0), 
                        "cn_filePath":path.join(__dirname, `./chunk_trans/${RandomGenerator.string(0,10,0)}/${RandomGenerator.string(0,10,0)}/`)},
                        "chunkSize" : 4 * 1024 * 1024,
                        "timeout" : 600 * 1000,
                        "root_path" : "/123/test/",
                        "chunkNumber" : 10,
                        "flags":0 
                    }
                    console.info("n++", n)
                   //初始化stack
                   console.info("devices_type: ",devices[n])
                    
                   let stack_res : stack_ty|undefined = await stacks(devices[n],[zone1ood,zone1device1,zone2ood,zone2device1])


                   let source : cyfs.SharedCyfsStack = stack_res!["stacks"][0] as cyfs.SharedCyfsStack
                   let target : cyfs.SharedCyfsStack = stack_res!["stacks"][1] as cyfs.SharedCyfsStack
                   let getdata_stacks : cyfs.SharedCyfsStack[] = stack_res!["getdate_stacks"] as cyfs.SharedCyfsStack[]
                   let test_getdate_stacks : cyfs.SharedCyfsStack[] = stack_res!["test_getdate_stacks"] as cyfs.SharedCyfsStack[]
                   let getdata_level: level_ty[] = stack_res!["getdate_level"] as level_ty[]
                   let getdate_assert: boolean[] = stack_res!["getdate_assert"] as boolean[]
                   cyfs.sleep(10)
                   
                   //生成测试文件
                   await RandomGenerator.createRandomFile(para.path.cn_filePath, para.path.cn_fileName, 1 * 1024 * 1024);
                   //生成path_handler 
                   let path_handler = new cyfs.RequestGlobalStatePath(target.dec_id, para.acl_path).toString()

                   //初始化数据
                   let res= (await trans_chunk_for_getdata(getdata_stacks,para.path.cn_filePath,"/" + para.path.cn_fileName,para.chunkSize,getdata_level))
                   //[object_map_id,file_id_from_objectmap,dir_id,chunkIdList]               
                   let object_map_id = res[0]
                   let file_id_from_objectmap = res[1]
                   let dir_id = res[2]
                   let chunkIdList = res[3]
                   
                   for(let m = 0; m<= AccPermissions.length; m++){
                       //遍历rmeta ACL权限
                       let acl_res: cyfs.PathOpEnvStub[]= (await r_meta_acc_acl(source,target,para.acl_path,AccPermissions[m]))!
                       let stub_source:cyfs.PathOpEnvStub= acl_res[0]  
                       //从target设备get 对象数据
                       console.log("chunkIdList",chunkIdList)
                       let chunkRecvPromise: Array<any> = []
                       for (let i = 0; i < chunkIdList!.length && i < para.chunkNumber; i++) {
                           console.log("chunkIdList_i_ ", i)
                           //chunkRecvPromise.push(new Promise(async (v) => {                     
                           let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                           console.info(`开始传输chunk:${chunkId},${buff}`)
                           
                           //将chunkid对象id挂在objet_map上
                           let obeject_map_res = await insert_object_map("Map",para.acl_path,chunkId.calculate_id(),stub_source)

                            //调用NDN get_data接口
                            let resp = await get_data(
                                [source,source,source],
                                [],
                                path_handler,
                                cyfs.NDNAPILevel.NDN,
                                object_map_id.object_id,
                                0,
                                path_handler)

                            console.info(`${chunkId} 下载结果：${resp}`)
                            //if (resp.err) {
                            //    v({ err: true, log: `ndn_service get_data failed` })
                            //}
                            //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                            //console.info(`下载chunk 成功： ${JSON.stringify(resp)}`)
                        // v({ err: false, chunkId: chunkId.calculate_id().to_base_58() })
                            }
                        
                        console.info("start download")
                        let download = []
                        //for (let i in chunkRecvPromise) {
                            //let result = await chunkRecvPromise[i]
                            //if (result.err) {
                            //    return { err: result.err, log: result.log }}
                            //download.push(result)                        
                        //}
                        //清理数据
                        //await clean_test_data(source,target,res[1],para.acl_path,para.path.filepath + "/" +para.path.fileName)

                        //return { err: false, log: `chunk 下载成功` };
                        
                        //return { err: false, log: `chunk 下载成功`, download };
                    }
                }
            })
        })
        describe("#NDN权限测试,objectmap_inner_path,trans_createtask",function (){
            it("#NDN权限测试,objectmap_inner_path,trans_createtask,chunk目标对象",async()=>{
            console.info("start")
            //遍历六种情况
            for(let n=0; n < devices.length; n++){
                let para = 
                {
                    "acl_path":"/test/api/test/",
                    "path":{
                    "en_fileName":RandomGenerator.string(10),
                    "en_filePath":path.join(__dirname, "./chunk_trans/source/"),
                    "cn_fileName":RandomGenerator.string(0,10,0), 
                    "cn_filePath":path.join(__dirname, `./chunk_trans/source/${RandomGenerator.string(0,10,0)}/${RandomGenerator.string(0,10,0)}/`),
                    "cn_localPath":path.join(__dirname, `./chunk_trans/target/${RandomGenerator.string(0,10,0)}/${RandomGenerator.string(0,10,0)}/`)},
                    "chunkSize" : 4 * 1024 * 1024,
                    "timeout" : 600 * 1000,
                    "root_path" : "/123/test/",
                    "chunkNumber" : 10,
                    "flags":0 
                }
                console.info("n++", n)
               //初始化stack
               console.info("devices_type: ",devices[n])
                    
               let stack_res : stack_ty|undefined = await stacks(devices[n],[zone1ood,zone1device1,zone2ood,zone2device1])


               let source : cyfs.SharedCyfsStack = stack_res!["stacks"][0] as cyfs.SharedCyfsStack
               let target : cyfs.SharedCyfsStack = stack_res!["stacks"][1] as cyfs.SharedCyfsStack
               let trans_stacks : cyfs.SharedCyfsStack[] = stack_res!["trans_stacks"] as cyfs.SharedCyfsStack[]
               let test_trans_stacks : cyfs.SharedCyfsStack[] = stack_res!["test_trans_stacks"] as cyfs.SharedCyfsStack[]
               let trans_level : level_ty[] = stack_res!["trans_level"] as level_ty[]
               let trans_assert : boolean[] = stack_res!["trans_assert"] as boolean[]
               cyfs.sleep(10)

               
               //生成测试文件
               await RandomGenerator.createRandomFile(para.path.cn_filePath, para.path.cn_fileName, 1 * 1024 * 1024);
               //生成path_handler 
               let path_handler = new cyfs.RequestGlobalStatePath(target.dec_id, para.acl_path).toString()

               //初始化数据
               let res= (await trans_chunk_for_getdata(trans_stacks,para.path.cn_filePath,"/" + para.path.cn_fileName,para.chunkSize,trans_level))
               //[object_map_id,file_id_from_objectmap,dir_id,chunkIdList]               
               let object_map_id = res[0]
               let file_id_from_objectmap = res[1]
               let dir_id = res[2]
               let chunkIdList = res[3]
               
               for(let m = 0; m<= AccPermissions.length; m++){
                   //遍历rmeta ACL权限
                   let acl_res: cyfs.PathOpEnvStub[]= (await r_meta_acc_acl(source,target,para.acl_path,AccPermissions[m]))!
                   let stub_source:cyfs.PathOpEnvStub= acl_res[0]  
                   //从target设备get 对象数据
                   console.log("chunkIdList",chunkIdList)
                   let chunkRecvPromise: Array<any> = []
                   for (let i = 0; i < chunkIdList!.length && i < para.chunkNumber; i++) {
                       console.log("chunkIdList_i_ ", i)
                       //chunkRecvPromise.push(new Promise(async (v) => {                     
                       let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                       console.info(`开始传输chunk:${chunkId},${buff}`)
                       
                       //将chunkid对象id挂在objet_map上
                       let obeject_map_res = await insert_object_map("Map",para.acl_path,chunkId.calculate_id(),stub_source)
                        //调用NDN get_data接口
                        let resp = await tarns_task(test_trans_stacks,[],path_handler,trans_level[3],chunkId.calculate_id(),para.path.cn_localPath,0,para.timeout)

                        console.info(`${chunkId} 下载结果：${resp}`)
                        //if (resp.err) {
                        //    v({ err: true, log: `ndn_service get_data failed` })
                        //}
                        //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                        //console.info(`下载chunk 成功： ${JSON.stringify(resp)}`)
                    // v({ err: false, chunkId: chunkId.calculate_id().to_base_58() })
                        }
                    
                    console.info("start download")
                    let download = []
                    //for (let i in chunkRecvPromise) {
                        //let result = await chunkRecvPromise[i]
                        //if (result.err) {
                        //    return { err: result.err, log: result.log }}
                        //download.push(result)                        
                    //}
                    //清理数据
                    //await clean_test_data(source,target,res[1],para.acl_path,para.path.filepath + "/" +para.path.fileName)

                    //return { err: false, log: `chunk 下载成功` };
                    
                    //return { err: false, log: `chunk 下载成功`, download };
                    }
                }
            })
            it("#NDN权限测试,objectmap_inner_path,trans_createtask,chunk目标对象,来源对象file",async()=>{
                console.info("start")
                //遍历六种情况
                for(let n=0; n < devices.length; n++){
                    let para = 
                    {
                        "acl_path":"/test/api/test/",
                        "path":{
                        "en_fileName":RandomGenerator.string(10),
                        "en_filePath":path.join(__dirname, "./chunk_trans/source/"),
                        "cn_fileName":RandomGenerator.string(0,10,0), 
                        "cn_filePath":path.join(__dirname, `./chunk_trans/source/${RandomGenerator.string(0,10,0)}/${RandomGenerator.string(0,10,0)}/`),
                        "cn_localPath":path.join(__dirname, `./chunk_trans/target/${RandomGenerator.string(0,10,0)}/${RandomGenerator.string(0,10,0)}/`)},
                        "chunkSize" : 4 * 1024 * 1024,
                        "timeout" : 600 * 1000,
                        "root_path" : "/123/test/",
                        "chunkNumber" : 10,
                        "flags":0 
                    }
                    console.info("n++", n)
                   //初始化stack
                   console.info("devices_type: ",devices[n])
                        
                   let stack_res : stack_ty|undefined = await stacks(devices[n],[zone1ood,zone1device1,zone2ood,zone2device1])
    
    
                   let source : cyfs.SharedCyfsStack = stack_res!["stacks"][0] as cyfs.SharedCyfsStack
                   let target : cyfs.SharedCyfsStack = stack_res!["stacks"][1] as cyfs.SharedCyfsStack
                   let trans_stacks : cyfs.SharedCyfsStack[] = stack_res!["trans_stacks"] as cyfs.SharedCyfsStack[]
                   let test_trans_stacks : cyfs.SharedCyfsStack[] = stack_res!["test_trans_stacks"] as cyfs.SharedCyfsStack[]
                   let trans_level : level_ty[] = stack_res!["trans_level"] as level_ty[]
                   let trans_assert : boolean[] = stack_res!["trans_assert"] as boolean[]
                   cyfs.sleep(10)
    
                   
                   //生成测试文件
                   await RandomGenerator.createRandomFile(para.path.cn_filePath, para.path.cn_fileName, 1 * 1024 * 1024);
                   //生成path_handler 
                   let path_handler = new cyfs.RequestGlobalStatePath(target.dec_id, para.acl_path).toString()
    
                   //初始化数据
                   let res= (await trans_chunk_for_getdata(trans_stacks,para.path.cn_filePath,"/" + para.path.cn_fileName,para.chunkSize,trans_level))
                   //[object_map_id,file_id_from_objectmap,dir_id,chunkIdList]               
                   let object_map_id = res[0]
                   let file_id_from_objectmap = res[1]
                   let dir_id = res[2]
                   let chunkIdList = res[3]
                   
                   for(let m = 0; m<= AccPermissions.length; m++){
                       //遍历rmeta ACL权限
                       let acl_res: cyfs.PathOpEnvStub[]= (await r_meta_acc_acl(source,target,para.acl_path,AccPermissions[m]))!
                       let stub_source:cyfs.PathOpEnvStub= acl_res[0]  
                       //从target设备get 对象数据
                       console.log("chunkIdList",chunkIdList)
                       let chunkRecvPromise: Array<any> = []
                       for (let i = 0; i < chunkIdList!.length && i < para.chunkNumber; i++) {
                           console.log("chunkIdList_i_ ", i)
                           //chunkRecvPromise.push(new Promise(async (v) => {                     
                           let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                           console.info(`开始传输chunk:${chunkId},${buff}`)
                           
                           //将chunkid对象id挂在objet_map上
                           let obeject_map_res = await insert_object_map("Map",para.acl_path,chunkId.calculate_id(),stub_source)
                            //调用NDN get_data接口
                            let resp = await tarns_task(test_trans_stacks,[],path_handler,trans_level[3],chunkId.calculate_id(),para.path.cn_localPath,0,para.timeout)
                            console.info(`${chunkId} 下载结果：${resp}`)
                            //if (resp.err) {
                            //    v({ err: true, log: `ndn_service get_data failed` })
                            //}
                            //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                            //console.info(`下载chunk 成功： ${JSON.stringify(resp)}`)
                        // v({ err: false, chunkId: chunkId.calculate_id().to_base_58() })
                            }
                        
                        console.info("start download")
                        let download = []
                        //for (let i in chunkRecvPromise) {
                            //let result = await chunkRecvPromise[i]
                            //if (result.err) {
                            //    return { err: result.err, log: result.log }}
                            //download.push(result)                        
                        //}
                        //清理数据
                        //await clean_test_data(source,target,res[1],para.acl_path,para.path.filepath + "/" +para.path.fileName)
    
                        //return { err: false, log: `chunk 下载成功` };
                        
                        //return { err: false, log: `chunk 下载成功`, download };
                        }
                    }
                })
            it("#NDN权限测试,objectmap_inner_path,trans_createtask,chunk目标对象,来源对象dir",async()=>{
                console.info("start")
                //遍历六种情况
                for(let n=0; n < devices.length; n++){
                    let para = 
                    {
                        "acl_path":"/test/api/test/",
                        "path":{
                        "en_fileName":RandomGenerator.string(10),
                        "en_filePath":path.join(__dirname, "./chunk_trans/source/"),
                        "cn_fileName":RandomGenerator.string(0,10,0), 
                        "cn_filePath":path.join(__dirname, `./chunk_trans/source/${RandomGenerator.string(0,10,0)}/${RandomGenerator.string(0,10,0)}/`),
                        "cn_localPath":path.join(__dirname, `./chunk_trans/target/${RandomGenerator.string(0,10,0)}/${RandomGenerator.string(0,10,0)}/`)},
                        "chunkSize" : 4 * 1024 * 1024,
                        "timeout" : 600 * 1000,
                        "root_path" : "/123/test/",
                        "chunkNumber" : 10,
                        "flags":0 
                    }
                    console.info("n++", n)
                   //初始化stack
                   console.info("devices_type: ",devices[n])
                        
                   let stack_res : stack_ty|undefined = await stacks(devices[n],[zone1ood,zone1device1,zone2ood,zone2device1])
    
    
                   let source : cyfs.SharedCyfsStack = stack_res!["stacks"][0] as cyfs.SharedCyfsStack
                   let target : cyfs.SharedCyfsStack = stack_res!["stacks"][1] as cyfs.SharedCyfsStack
                   let trans_stacks : cyfs.SharedCyfsStack[] = stack_res!["trans_stacks"] as cyfs.SharedCyfsStack[]
                   let test_trans_stacks : cyfs.SharedCyfsStack[] = stack_res!["test_trans_stacks"] as cyfs.SharedCyfsStack[]
                   let trans_level : level_ty[] = stack_res!["trans_level"] as level_ty[]
                   let trans_assert : boolean[] = stack_res!["trans_assert"] as boolean[]
                   cyfs.sleep(10)
    
                   
                   //生成测试文件
                   await RandomGenerator.createRandomFile(para.path.cn_filePath, para.path.cn_fileName, 1 * 1024 * 1024);
                   //生成path_handler 
                   let path_handler = new cyfs.RequestGlobalStatePath(target.dec_id, para.acl_path).toString()
    
                   //初始化数据
                   let res= (await trans_chunk_for_getdata(trans_stacks,para.path.cn_filePath,"/" + para.path.cn_fileName,para.chunkSize,trans_level))
                   //[object_map_id,file_id_from_objectmap,dir_id,chunkIdList]               
                   let object_map_id = res[0]
                   let file_id_from_objectmap = res[1]
                   let dir_id = res[2]
                   let chunkIdList = res[3]
                   
                   for(let m = 0; m<= AccPermissions.length; m++){
                       //遍历rmeta ACL权限
                       let acl_res: cyfs.PathOpEnvStub[]= (await r_meta_acc_acl(source,target,para.acl_path,AccPermissions[m]))!
                       let stub_source:cyfs.PathOpEnvStub= acl_res[0]  
                       //从target设备get 对象数据
                       console.log("chunkIdList",chunkIdList)
                       let chunkRecvPromise: Array<any> = []
                       for (let i = 0; i < chunkIdList!.length && i < para.chunkNumber; i++) {
                           console.log("chunkIdList_i_ ", i)
                           //chunkRecvPromise.push(new Promise(async (v) => {                     
                           let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                           console.info(`开始传输chunk:${chunkId},${buff}`)
                           
                           //将chunkid对象id挂在objet_map上
                           let obeject_map_res = await insert_object_map("Map",para.acl_path,chunkId.calculate_id(),stub_source)
                            //调用NDN get_data接口
                            let resp = await tarns_task(test_trans_stacks,[],path_handler,trans_level[3],chunkId.calculate_id(),para.path.cn_localPath,0,para.timeout)
    
                            console.info(`${chunkId} 下载结果：${resp}`)
                            //if (resp.err) {
                            //    v({ err: true, log: `ndn_service get_data failed` })
                            //}
                            //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                            //console.info(`下载chunk 成功： ${JSON.stringify(resp)}`)
                        // v({ err: false, chunkId: chunkId.calculate_id().to_base_58() })
                            }
                        
                        console.info("start download")
                        let download = []
                        //for (let i in chunkRecvPromise) {
                            //let result = await chunkRecvPromise[i]
                            //if (result.err) {
                            //    return { err: result.err, log: result.log }}
                            //download.push(result)                        
                        //}
                        //清理数据
                        //await clean_test_data(source,target,res[1],para.acl_path,para.path.filepath + "/" +para.path.fileName)
    
                        //return { err: false, log: `chunk 下载成功` };
                        
                        //return { err: false, log: `chunk 下载成功`, download };
                        }
                    }
                })
            it("#NDN权限测试,objectmap_inner_path,trans_createtask,chunk目标对象,来源对象objectmap+inner_path",async()=>{
                console.info("start")
                //遍历六种情况
                for(let n=0; n < devices.length; n++){
                    let para = 
                    {
                        "acl_path":"/test/api/test/",
                        "path":{
                        "en_fileName":RandomGenerator.string(10),
                        "en_filePath":path.join(__dirname, "./chunk_trans/source/"),
                        "cn_fileName":RandomGenerator.string(0,10,0), 
                        "cn_filePath":path.join(__dirname, `./chunk_trans/source/${RandomGenerator.string(0,10,0)}/${RandomGenerator.string(0,10,0)}/`),
                        "cn_localPath":path.join(__dirname, `./chunk_trans/target/${RandomGenerator.string(0,10,0)}/${RandomGenerator.string(0,10,0)}/`)},
                        "chunkSize" : 4 * 1024 * 1024,
                        "timeout" : 600 * 1000,
                        "root_path" : "/123/test/",
                        "chunkNumber" : 10,
                        "flags":0 
                    }
                    console.info("n++", n)
                   //初始化stack
                   console.info("devices_type: ",devices[n])
                        
                   let stack_res : stack_ty|undefined = await stacks(devices[n],[zone1ood,zone1device1,zone2ood,zone2device1])
    
    
                   let source : cyfs.SharedCyfsStack = stack_res!["stacks"][0] as cyfs.SharedCyfsStack
                   let target : cyfs.SharedCyfsStack = stack_res!["stacks"][1] as cyfs.SharedCyfsStack
                   let trans_stacks : cyfs.SharedCyfsStack[] = stack_res!["trans_stacks"] as cyfs.SharedCyfsStack[]
                   let test_trans_stacks : cyfs.SharedCyfsStack[] = stack_res!["test_trans_stacks"] as cyfs.SharedCyfsStack[]
                   let trans_level : level_ty[] = stack_res!["trans_level"] as level_ty[]
                   let trans_assert : boolean[] = stack_res!["trans_assert"] as boolean[]
                   cyfs.sleep(10)
    
                   
                   //生成测试文件
                   await RandomGenerator.createRandomFile(para.path.cn_filePath, para.path.cn_fileName, 1 * 1024 * 1024);
                   //生成path_handler 
                   let path_handler = new cyfs.RequestGlobalStatePath(target.dec_id, para.acl_path).toString()
    
                   //初始化数据
                   let res= (await trans_chunk_for_getdata(trans_stacks,para.path.cn_filePath,"/" + para.path.cn_fileName,para.chunkSize,trans_level))
                   //[object_map_id,file_id_from_objectmap,dir_id,chunkIdList]               
                   let object_map_id = res[0]
                   let file_id_from_objectmap = res[1]
                   let dir_id = res[2]
                   let chunkIdList = res[3]
                   
                   for(let m = 0; m<= AccPermissions.length; m++){
                       //遍历rmeta ACL权限
                       let acl_res: cyfs.PathOpEnvStub[]= (await r_meta_acc_acl(source,target,para.acl_path,AccPermissions[m]))!
                       let stub_source:cyfs.PathOpEnvStub= acl_res[0]  
                       //从target设备get 对象数据
                       console.log("chunkIdList",chunkIdList)
                       let chunkRecvPromise: Array<any> = []
                       for (let i = 0; i < chunkIdList!.length && i < para.chunkNumber; i++) {
                           console.log("chunkIdList_i_ ", i)
                           //chunkRecvPromise.push(new Promise(async (v) => {                     
                           let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                           console.info(`开始传输chunk:${chunkId},${buff}`)
                           
                           //将chunkid对象id挂在objet_map上
                           let obeject_map_res = await insert_object_map("Map",para.acl_path,chunkId.calculate_id(),stub_source)
                            //调用NDN get_data接口
                            let resp = await tarns_task(test_trans_stacks,[],path_handler,trans_level[3],chunkId.calculate_id(),para.path.cn_localPath,0,para.timeout)
    
                            console.info(`${chunkId} 下载结果：${resp}`)
                            //if (resp.err) {
                            //    v({ err: true, log: `ndn_service get_data failed` })
                            //}
                            //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                            //console.info(`下载chunk 成功： ${JSON.stringify(resp)}`)
                        // v({ err: false, chunkId: chunkId.calculate_id().to_base_58() })
                            }
                        
                        console.info("start download")
                        let download = []
                        //for (let i in chunkRecvPromise) {
                            //let result = await chunkRecvPromise[i]
                            //if (result.err) {
                            //    return { err: result.err, log: result.log }}
                            //download.push(result)                        
                        //}
                        //清理数据
                        //await clean_test_data(source,target,res[1],para.acl_path,para.path.filepath + "/" +para.path.fileName)
    
                        //return { err: false, log: `chunk 下载成功` };
                        
                        //return { err: false, log: `chunk 下载成功`, download };
                        }
                    }
                })
            it("#NDN权限测试,objectmap_inner_path,trans_createtask,File目标对象",async()=>{
                console.info("start")
                //遍历六种情况
                for(let n=0; n < devices.length; n++){
                    let para = 
                    {
                        "acl_path":"/test/api/test/",
                        "path":{
                        "en_fileName":RandomGenerator.string(10),
                        "en_filePath":path.join(__dirname, "./chunk_trans/source/"),
                        "cn_fileName":RandomGenerator.string(0,10,0), 
                        "cn_filePath":path.join(__dirname, `./chunk_trans/source/${RandomGenerator.string(0,10,0)}/${RandomGenerator.string(0,10,0)}/`),
                        "cn_localPath":path.join(__dirname, `./chunk_trans/target/${RandomGenerator.string(0,10,0)}/${RandomGenerator.string(0,10,0)}/`)},
                        "chunkSize" : 4 * 1024 * 1024,
                        "timeout" : 600 * 1000,
                        "root_path" : "/123/test/",
                        "chunkNumber" : 10,
                        "flags":0 
                    }
                    console.info("n++", n)
                   //初始化stack
                   console.info("devices_type: ",devices[n])
                        
                   let stack_res : stack_ty|undefined = await stacks(devices[n],[zone1ood,zone1device1,zone2ood,zone2device1])
    
    
                   let source : cyfs.SharedCyfsStack = stack_res!["stacks"][0] as cyfs.SharedCyfsStack
                   let target : cyfs.SharedCyfsStack = stack_res!["stacks"][1] as cyfs.SharedCyfsStack
                   let trans_stacks : cyfs.SharedCyfsStack[] = stack_res!["trans_stacks"] as cyfs.SharedCyfsStack[]
                   let test_trans_stacks : cyfs.SharedCyfsStack[] = stack_res!["test_trans_stacks"] as cyfs.SharedCyfsStack[]
                   let trans_level : level_ty[] = stack_res!["trans_level"] as level_ty[]
                   let trans_assert : boolean[] = stack_res!["trans_assert"] as boolean[]
                   cyfs.sleep(10)
    
                   
                   //生成测试文件
                   await RandomGenerator.createRandomFile(para.path.cn_filePath, para.path.cn_fileName, 1 * 1024 * 1024);
                   //生成path_handler 
                   let path_handler = new cyfs.RequestGlobalStatePath(target.dec_id, para.acl_path).toString()
    
                   //初始化数据
                   let res= (await trans_chunk_for_getdata(trans_stacks,para.path.cn_filePath,"/" + para.path.cn_fileName,para.chunkSize,trans_level))
                   //[object_map_id,file_id_from_objectmap,dir_id,chunkIdList]               
                   let object_map_id = res[0]
                   let file_id_from_objectmap = res[1]
                   let dir_id = res[2]
                   let chunkIdList = res[3]
                   
                   for(let m = 0; m<= AccPermissions.length; m++){
                       //遍历rmeta ACL权限
                       let acl_res: cyfs.PathOpEnvStub[]= (await r_meta_acc_acl(source,target,para.acl_path,AccPermissions[m]))!
                       let stub_source:cyfs.PathOpEnvStub= acl_res[0]  
                       //从target设备get 对象数据
                       console.log("chunkIdList",chunkIdList)
                       let chunkRecvPromise: Array<any> = []
                       for (let i = 0; i < chunkIdList!.length && i < para.chunkNumber; i++) {
                           console.log("chunkIdList_i_ ", i)
                           //chunkRecvPromise.push(new Promise(async (v) => {                     
                           let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                           console.info(`开始传输chunk:${chunkId},${buff}`)
                           
                           //将chunkid对象id挂在objet_map上
                           let obeject_map_res = await insert_object_map("Map",para.acl_path,chunkId.calculate_id(),stub_source)
                            //调用NDN get_data接口
                            let resp = await tarns_task(test_trans_stacks,[],path_handler,trans_level[3],chunkId.calculate_id(),para.path.cn_localPath,0,para.timeout)
    
                            console.info(`${chunkId} 下载结果：${resp}`)
                            //if (resp.err) {
                            //    v({ err: true, log: `ndn_service get_data failed` })
                            //}
                            //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                            //console.info(`下载chunk 成功： ${JSON.stringify(resp)}`)
                        // v({ err: false, chunkId: chunkId.calculate_id().to_base_58() })
                            }
                        
                        console.info("start download")
                        let download = []
                        //for (let i in chunkRecvPromise) {
                            //let result = await chunkRecvPromise[i]
                            //if (result.err) {
                            //    return { err: result.err, log: result.log }}
                            //download.push(result)                        
                        //}
                        //清理数据
                        //await clean_test_data(source,target,res[1],para.acl_path,para.path.filepath + "/" +para.path.fileName)
    
                        //return { err: false, log: `chunk 下载成功` };
                        
                        //return { err: false, log: `chunk 下载成功`, download };
                        }
                    }
                })
            it("#NDN权限测试,objectmap_inner_path,trans_createtask,File目标对象,来源对象objectmap_inner_path",async()=>{
                console.info("start")
                //遍历六种情况
                for(let n=0; n < devices.length; n++){
                    let para = 
                    {
                        "acl_path":"/test/api/test/",
                        "path":{
                        "en_fileName":RandomGenerator.string(10),
                        "en_filePath":path.join(__dirname, "./chunk_trans/source/"),
                        "cn_fileName":RandomGenerator.string(0,10,0), 
                        "cn_filePath":path.join(__dirname, `./chunk_trans/source/${RandomGenerator.string(0,10,0)}/${RandomGenerator.string(0,10,0)}/`),
                        "cn_localPath":path.join(__dirname, `./chunk_trans/target/${RandomGenerator.string(0,10,0)}/${RandomGenerator.string(0,10,0)}/`)},
                        "chunkSize" : 4 * 1024 * 1024,
                        "timeout" : 600 * 1000,
                        "root_path" : "/123/test/",
                        "chunkNumber" : 10,
                        "flags":0 
                    }
                    console.info("n++", n)
                   //初始化stack
                   console.info("devices_type: ",devices[n])
                        
                   let stack_res : stack_ty|undefined = await stacks(devices[n],[zone1ood,zone1device1,zone2ood,zone2device1])
    
    
                   let source : cyfs.SharedCyfsStack = stack_res!["stacks"][0] as cyfs.SharedCyfsStack
                   let target : cyfs.SharedCyfsStack = stack_res!["stacks"][1] as cyfs.SharedCyfsStack
                   let trans_stacks : cyfs.SharedCyfsStack[] = stack_res!["trans_stacks"] as cyfs.SharedCyfsStack[]
                   let test_trans_stacks : cyfs.SharedCyfsStack[] = stack_res!["test_trans_stacks"] as cyfs.SharedCyfsStack[]
                   let trans_level : level_ty[] = stack_res!["trans_level"] as level_ty[]
                   let trans_assert : boolean[] = stack_res!["trans_assert"] as boolean[]
                   cyfs.sleep(10)
    
                   
                   //生成测试文件
                   await RandomGenerator.createRandomFile(para.path.cn_filePath, para.path.cn_fileName, 1 * 1024 * 1024);
                   //生成path_handler 
                   let path_handler = new cyfs.RequestGlobalStatePath(target.dec_id, para.acl_path).toString()
    
                   //初始化数据
                   let res= (await trans_chunk_for_getdata(trans_stacks,para.path.cn_filePath,"/" + para.path.cn_fileName,para.chunkSize,trans_level))
                   //[object_map_id,file_id_from_objectmap,dir_id,chunkIdList]               
                   let object_map_id = res[0]
                   let file_id_from_objectmap = res[1]
                   let dir_id = res[2]
                   let chunkIdList = res[3]
                   
                   for(let m = 0; m<= AccPermissions.length; m++){
                       //遍历rmeta ACL权限
                       let acl_res: cyfs.PathOpEnvStub[]= (await r_meta_acc_acl(source,target,para.acl_path,AccPermissions[m]))!
                       let stub_source:cyfs.PathOpEnvStub= acl_res[0]  
                       //从target设备get 对象数据
                       console.log("chunkIdList",chunkIdList)
                       let chunkRecvPromise: Array<any> = []
                       for (let i = 0; i < chunkIdList!.length && i < para.chunkNumber; i++) {
                           console.log("chunkIdList_i_ ", i)
                           //chunkRecvPromise.push(new Promise(async (v) => {                     
                           let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                           console.info(`开始传输chunk:${chunkId},${buff}`)
                           
                           //将chunkid对象id挂在objet_map上
                           let obeject_map_res = await insert_object_map("Map",para.acl_path,chunkId.calculate_id(),stub_source)
                            //调用NDN get_data接口
                            let resp = await tarns_task(test_trans_stacks,[],path_handler,trans_level[3],chunkId.calculate_id(),para.path.cn_localPath,0,para.timeout)
    
                            console.info(`${chunkId} 下载结果：${resp}`)
                            //if (resp.err) {
                            //    v({ err: true, log: `ndn_service get_data failed` })
                            //}
                            //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                            //console.info(`下载chunk 成功： ${JSON.stringify(resp)}`)
                        // v({ err: false, chunkId: chunkId.calculate_id().to_base_58() })
                            }
                        
                        console.info("start download")
                        let download = []
                        //for (let i in chunkRecvPromise) {
                            //let result = await chunkRecvPromise[i]
                            //if (result.err) {
                            //    return { err: result.err, log: result.log }}
                            //download.push(result)                        
                        //}
                        //清理数据
                        //await clean_test_data(source,target,res[1],para.acl_path,para.path.filepath + "/" +para.path.fileName)
    
                        //return { err: false, log: `chunk 下载成功` };
                        
                        //return { err: false, log: `chunk 下载成功`, download };
                        }
                    }
                })
        })
    })
})