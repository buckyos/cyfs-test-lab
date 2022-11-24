import * as fs from "fs-extra";
import assert = require('assert');
import * as cyfs from '../../cyfs_node/cyfs_node'
import { ZoneSimulator, stringToUint8Array, RandomGenerator, stackInfo } from "../../common";
import * as path from 'path';
import * as gen_Dir from "../../common/utils/generator"
import * as events from 'events'
export const Emitter = new events.EventEmitter();

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

//acl权限过程

let acc = new cyfs.AccessString(0)
acc.set_group_permissions(cyfs.AccessGroup.OthersZone,cyfs.AccessPermissions.None)
acc.set_group_permissions(cyfs.AccessGroup.OthersDec,cyfs.AccessPermissions.None)
acc.set_group_permissions(cyfs.AccessGroup.CurrentDevice,cyfs.AccessPermissions.None)
acc.set_group_permissions(cyfs.AccessGroup.CurrentZone,cyfs.AccessPermissions.None)
/*common handler----------------------------------------------------------------------------------------------------------------------------------------------------------*/

class PutDataHandlerDefault implements cyfs.RouterHandlerPutDataRoutine {
    private device: string;
    private handlerId: string;
    private chain: string
    constructor(device: string, handlerId: string, chain: string) {
        this.device = device;
        this.handlerId = handlerId;
        this.chain = chain;
    }
    async call(param: cyfs.RouterHandlerPutDataRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerPutDataResult>> {
        Emitter.emit('handlerRunning', this.device, 'PutDataHandlerDefault', this.handlerId, this.chain)
        const codec = new cyfs.NDNPutDataOutputRequestJsonCodec();
        console.info(codec.encode_object(param.request));
        //console.info(`get_object: id=${param.object_id}`);
        const result: cyfs.RouterHandlerPutDataResult = {
            action: cyfs.RouterHandlerAction.Default
        };
        return cyfs.Ok(result)
    }
}

/*common function----------------------------------------------------------------------------------------------------------------------------------------------------*/

async function trans_chunk_for_getdata(stack:cyfs.SharedCyfsStack[], filePath: string,inner_path:string, chunkSize: number, level:any[]):Promise<any>{
    console.info('开始chunk')
    console.info("filePath",filePath)
    console.info("inner_path",inner_path)
    //1. source 设备 publish_file 将文件存放到本地NDC 
    let owner = stack[0].local_device().desc().owner()!.unwrap()
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


    //4. source 设备 将文件对象put 到 targrt 设备
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

    return [object_map_id,file_id_from_objectmap,dir_id,chunkIdList]
}

async function trans_file_for_task(stack:cyfs.SharedCyfsStack[], filePath: string,inner_path:string, chunkSize: number, level:any[]):Promise<any>{
    console.info('开始chunk')
    console.info("filePath",filePath)
    console.info("inner_path",inner_path)
    //1. source 设备 publish_file 将文件存放到本地NDC 
    let owner = stack[0].local_device().desc().owner()!.unwrap()
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

//async function download_object(){}

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
async function insert_object_map(type:string,path:string,key:any,GlobalState:cyfs.GlobalStateStub,acc:cyfs.RootStateOpEnvAccess){
    let PathOpEnv = (await GlobalState.create_path_op_env_with_access(acc)).unwrap()
    //将对象id挂在objet_map上
    switch(type){
        case "Map":   
            console.info(`#create_new_with_path_map ${JSON.stringify(await PathOpEnv.create_new_with_path(path,cyfs.ObjectMapSimpleContentType.Map))}`)
            console.info(`#remove_with_path  ${JSON.stringify(await PathOpEnv.remove_with_path(path))}`)
            console.info(`#insert_with_path_result:${JSON.stringify(await PathOpEnv.insert_with_path(path, key))}`)
            let obj1  = cyfs.TextObject.create(cyfs.Some(cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap()),`A${RandomGenerator.string(10)}`,`A${RandomGenerator.string(10)}`,`${RandomGenerator.string(10)}`)
            let obj_id1 = obj1.desc().object_id();
            console.info(`#before update_result",${JSON.stringify(await PathOpEnv.update())}`)
            console.info(`#insert_with_path_result:${JSON.stringify(await PathOpEnv.insert_with_path(path, obj_id1))}`)
            let before_path_map = await PathOpEnv.update()
            let before_root = before_path_map.unwrap().root
            let before_dec_root = before_path_map.unwrap().dec_root
            console.info(`#set_with_path_result:${JSON.stringify(await PathOpEnv.set_with_path(path, key))}`)
            let after_path_map = await PathOpEnv.update()
            let after_root = after_path_map.unwrap().root
            let after_dec_root = after_path_map.unwrap().dec_root
            return [before_root,before_dec_root,after_root,after_dec_root]
        case "Set":
            console.info(`#create_new_with_path_map ${JSON.stringify(await PathOpEnv.create_new_with_path(path,cyfs.ObjectMapSimpleContentType.Set))}`)
            console.info(`#remove_with_path  ${JSON.stringify(await PathOpEnv.remove_with_path(path))}`)
            console.info(`# insert_with_path_result1:${JSON.stringify(await PathOpEnv.set_with_path(path, key))}`)
            console.info(`#update_result2",${JSON.stringify(await PathOpEnv.update())}`)
            break;
    }
    
}

/*----------------------------------------------------------------------------------------------------------------------------------------------------------*/

describe("#NDN权限测试,objectmap_inner_path ",function(){
    this.timeout(0);
    this.beforeAll(async function () {
        await ZoneSimulator.init(false,false,' Console',"http");
        //await ZoneSimulator.init(false,false,' RDP-Tcp',"http");
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
    describe("#NDN权限测试,objectmap_inner_path 同设备",function(){
        describe("#NDN权限测试,objectmap_inner_path,同zone",async()=>{
            describe("#NDN权限测试,objectmap_inner_path,同zone同dec",async()=>{
                describe("#NDN权限测试,objectmap_inner_path,getdata",async()=>{
                    //this.beforeEach(function(){});
                    //this.afterEach(function(){});
                    it("#NDN权限测试,objectmap_inner_path,getdata,chunk目标对象",async()=>{
                        //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1ood.fork_with_new_dec(DecId.DecIdA)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let root_path = "/123/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        //let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        //let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        

                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                         let res= (await trans_chunk_for_getdata(stack,filePath,"\\" + fileName,chunkSize,level))
                         let chunkIdList = res[3]
                         

                        //从target设备get 对象数据
                        console.log("chunkIdList",chunkIdList)
                        let chunkRecvPromise: Array<any> = []
                        for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                            console.log("chunkIdList_i_ ", i)
                            chunkRecvPromise.push(new Promise(async (v) => {                     
                            let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                            console.info(`开始传输chunk:${chunkId},${buff}`)
                            
                            //将chunkid对象id挂在objet_map上
                            insert_object_map("Map",acl_path,chunkId.calculate_id(),stub_source,env_acc)

                            //await op_env_stub_source.commit()
                            //调用get_data接口
                            let req: cyfs.NDNGetDataOutputRequest = {
                                common: {                                   
                                    level: cyfs.NDNAPILevel.NDN,// api级别
                                    dec_id: source.dec_id, //这里可以模拟当前dec_id
                                    target: target.local_device_id().object_id,
                                    // 需要处理数据的关联对象，主要用以chunk/file等+-
                                    referer_object: [],
                                    flags: 0,
                                    req_path: path_handler//如果没有DecId，那么就当当前decid处理
                                },
                                // 目前只支持ChunkId/FileId/DirId
                                object_id: chunkId.calculate_id()
                                
                            }

                            let resp = await source.ndn_service().get_data(req)
                            console.info(`${chunkId} 下载结果：${resp}`)
                            if (resp.err) {
                                v({ err: true, log: `ndn_service get_data failed` })
                            }
                            assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                            console.info(`下载chunk 成功： ${JSON.stringify(resp)}`)
                            v({ err: false, chunkId: chunkId.calculate_id().to_base_58() })
                        }))
                        }
                        let download = []
                        for (let i in chunkRecvPromise) {
                            let result = await chunkRecvPromise[i]
                            if (result.err) {
                                return { err: result.err, log: result.log }
                        }
                        download.push(result)                        
                        }
                        //清理数据
                        await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                        
                        return { err: false, log: `chunk 下载成功`, download };
                    })
                    it("#NDN权限测试,objectmap_inner_path,get_data,chunk目标对象,来源对象file",async()=>{
                          //stack
                          let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                          let target = zone1ood.fork_with_new_dec(DecId.DecIdA)
  
                          //test conf
                          let fileName = RandomGenerator.string(10);
                          let filePath = path.join(__dirname, "./chunk_trans/source/")
                          console.log("filePath",filePath)
                          let chunkSize = 4 * 1024 * 1024
                          let chunkNumber = 10
                          let timeout: number = 600 * 1000                
                          let acl_path = "/test/api/test/"
                          let decid = target.dec_id
  
                          //create test file
                          await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);
  
                          //acl
                          await source.root_state_meta_stub(undefined,undefined).clear_access()
                          await target.root_state_meta_stub(undefined,undefined).clear_access()
                          await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                          await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
  
                          //rmeta
                          let stub_source = source.root_state_stub(undefined,undefined)
                          let stub_target = target.root_state_stub(undefined,undefined)
  
                          let env_acc:cyfs.RootStateOpEnvAccess = {
                          path:acl_path,
                          access:cyfs.AccessPermissions.Full 
                          }
      
                          //vaildate
                          let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()
  
                          let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                          let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                          
                          //初始化数据
                          let stack = [source,source,source,source,source,source,source,source,source,source]
                          let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                           let res= (await trans_chunk_for_getdata(stack,filePath,"/" + fileName,chunkSize,level))
                           let chunkIdList = res[3]
                           //[object_map_id,file_id_from_objectmap,dir_id,chunkIdList]
                           
  
                          //从target设备get 对象数据
                          console.log("chunkIdList",chunkIdList)
                          let chunkRecvPromise: Array<any> = []
                          for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                              console.log("chunkIdList_i_ ", i)
                              chunkRecvPromise.push(new Promise(async (v) => {
  
                              setTimeout(() => {v({ err: true, log: `ndn_service get_data timeout` })}, timeout)                       
                              let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                              console.info(`开始传输chunk:${chunkId},${buff}`)
  
                              //将chunkid对象id挂在objet_map上
                              console.info("remove_with_path", await op_env_stub_target.remove_with_path(acl_path))
                              let result1 = await op_env_stub_target.insert_with_path(acl_path, res[1].object_id)
                              console.info(`# insert_with_path_result1:${JSON.stringify(result1)}}`)
                              assert.ok(!result1.err)
  
                              let update_result2 = await op_env_stub_source.update()
                              console.info("update_result2",update_result2)
                              assert.ok(!update_result2.err)
  
                              let list_result1 = await op_env_stub_source.list(acl_path)
                              console.info("list_result1",list_result1)
  
  
  
                              //await op_env_stub_source.commit()
                              //调用get_data接口
                              let req: cyfs.NDNGetDataOutputRequest = {
                                  common: {                                   
                                      level: cyfs.NDNAPILevel.NDN,// api级别
                                      dec_id: source.dec_id, //这里可以模拟当前dec_id
                                      target: target.local_device_id().object_id,
                                      // 需要处理数据的关联对象，主要用以chunk/file等+-
                                      referer_object: [new cyfs.NDNDataRefererObject(undefined,res[1].object_id)],
                                      flags: 0,
                                      req_path: path_handler//如果没有DecId，那么就当当前decid处理
                                  },
                                  // 目前只支持ChunkId/FileId/DirId
                                  object_id: chunkId.calculate_id()
                                  
                              }
  
                              let resp = await source.ndn_service().get_data(req)
                              console.info(`${chunkId} 下载结果：${resp}`)
                              if (resp.err) {
                                  v({ err: true, log: `ndn_service get_data failed` })
                              }
                              //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                              console.info(`下载chunk 成功： ${JSON.stringify(resp)}`)
                              v({ err: false, chunkId: chunkId.calculate_id().to_base_58() })
                          }))
                          }
                          let download = []
                          for (let i in chunkRecvPromise) {
                          let result = await chunkRecvPromise[i]
                          if (result.err) {
                              return { err: result.err, log: result.log }
                          }
                          download.push(result)                        
                          }
                          //清理数据
                          await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                          
                          return { err: false, log: `chunk 下载成功`, download };
                    })
                    //需要增加chunkid与dir的关联
                    it("#NDN权限测试,objectmap_inner_path,get_data,chunk目标对象,来源对象dir",async()=>{
                         //stack
                         let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                         let target = zone1ood.fork_with_new_dec(DecId.DecIdA)
                         //test conf
                         let fileName = RandomGenerator.string(10);
                         let filePath = path.join(__dirname, "./chunk_trans/source/")
                         console.log("filePath",filePath)
                         let chunkSize = 4 * 1024 * 1024
                         let chunkNumber = 10
                         let timeout: number = 600 * 1000                
                         let acl_path = "/test/api/test/"
                         let decid = target.dec_id
 
                         //create test file
                         await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);
 
                         //acl
                         await source.root_state_meta_stub(undefined,undefined).clear_access()
                         await target.root_state_meta_stub(undefined,undefined).clear_access()
                         await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                         await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
 
                         //rmeta
                         let stub_source = source.root_state_stub(undefined,undefined)
                         let stub_target = target.root_state_stub(undefined,undefined)
 
                         let env_acc:cyfs.RootStateOpEnvAccess = {
                         path:acl_path,
                         access:cyfs.AccessPermissions.Full 
                         }
     
                         //vaildate
                         let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()
 
                         let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                         let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                         
                         //初始化数据
                         let stack = [source,source,source,source,source,source,source,source,source,source]
                         let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                          let res= (await trans_chunk_for_getdata(stack,filePath,"/" + fileName,chunkSize,level))
                          let chunkIdList = res[3]
                          //[object_map_id,file_id_from_objectmap,dir_id,chunkIdList]
                          
 
                         //从target设备get 对象数据
                         console.log("chunkIdList",chunkIdList)
                         let chunkRecvPromise: Array<any> = []
                         for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                             console.log("chunkIdList_i_ ", i)
                             chunkRecvPromise.push(new Promise(async (v) => {
 
                             setTimeout(() => {v({ err: true, log: `ndn_service get_data timeout` })}, timeout)                       
                             let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                             console.info(`开始传输chunk:${chunkId},${buff}`)
 
                             //将chunkid对象id挂在objet_map上
                             console.info("remove_with_path", await op_env_stub_target.remove_with_path(acl_path))
                             let result1 = await op_env_stub_target.insert_with_path(acl_path, res[1].object_id)
                             console.info(`# insert_with_path_result1:${JSON.stringify(result1)}}`)
                             assert.ok(!result1.err)
 
                             let update_result2 = await op_env_stub_source.update()
                             console.info("update_result2",update_result2)
                             assert.ok(!update_result2.err)
 
                             let list_result1 = await op_env_stub_source.list(acl_path)
                             console.info("list_result1",list_result1)
 
 
 
                             //await op_env_stub_source.commit()
                             //调用get_data接口
                             let req: cyfs.NDNGetDataOutputRequest = {
                                 common: {                                   
                                     level: cyfs.NDNAPILevel.NDN,// api级别
                                     dec_id: source.dec_id, //这里可以模拟当前dec_id
                                     target: target.local_device_id().object_id,
                                     // 需要处理数据的关联对象，主要用以chunk/file等+-
                                     referer_object: [new cyfs.NDNDataRefererObject(undefined,res[1].object_id)],
                                     flags: 0,
                                     req_path: path_handler//如果没有DecId，那么就当当前decid处理
                                 },
                                 // 目前只支持ChunkId/FileId/DirId
                                 object_id: chunkId.calculate_id()
                                 
                             }
 
                             let resp = await source.ndn_service().get_data(req)
                             console.info(`${chunkId} 下载结果：${resp}`)
                             if (resp.err) {
                                 v({ err: true, log: `ndn_service get_data failed` })
                             }
                             //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                             console.info(`下载chunk 成功： ${JSON.stringify(resp)}`)
                             v({ err: false, chunkId: chunkId.calculate_id().to_base_58() })
                         }))
                         }
                         let download = []
                         for (let i in chunkRecvPromise) {
                            let result = await chunkRecvPromise[i]
                            if (result.err) {
                                return { err: result.err, log: result.log }
                         }
                         download.push(result)                        
                         }
                         //清理数据
                         await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                         
                         return { err: false, log: `chunk 下载成功`, download };

                    })
                    it("#NDN权限测试,objectmap_inner_path,get_data,chunk目标对象,来源对象objectmap+inner_path",async()=>{
                        //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1ood.fork_with_new_dec(DecId.DecIdA)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                         let res= (await trans_chunk_for_getdata(stack,filePath,"/" + fileName,chunkSize,level))
                         let chunkIdList = res[3]
                         

                        //从target设备get 对象数据
                        console.log("chunkIdList",chunkIdList)
                        let chunkRecvPromise: Array<any> = []
                        for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                            console.log("chunkIdList_i_ ", i)
                            chunkRecvPromise.push(new Promise(async (v) => {

                            setTimeout(() => {v({ err: true, log: `ndn_service get_data timeout` })}, timeout)                       
                            let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                            console.info(`开始传输chunk:${chunkId},${buff}`)

                            //将chunkid对象id挂在objet_map上
                            console.info("remove_with_path", await op_env_stub_target.remove_with_path(acl_path))
                            let result1 = await op_env_stub_target.insert_with_path(acl_path, res[1].object_id)
                            console.info(`# insert_with_path_result1:${JSON.stringify(result1)}}`)
                            assert.ok(!result1.err)

                            let update_result2 = await op_env_stub_source.update()
                            console.info("update_result2",update_result2)
                            assert.ok(!update_result2.err)

                            let list_result1 = await op_env_stub_source.list(acl_path)
                            console.info("list_result1",list_result1)



                            //await op_env_stub_source.commit()
                            //调用get_data接口
                            let req: cyfs.NDNGetDataOutputRequest = {
                                common: {                                   
                                    level: cyfs.NDNAPILevel.NDN,// api级别
                                    dec_id: source.dec_id, //这里可以模拟当前dec_id
                                    target: target.local_device_id().object_id,
                                    // 需要处理数据的关联对象，主要用以chunk/file等+-
                                    referer_object: [new cyfs.NDNDataRefererObject(undefined,res[0].object_id,"/" + fileName)],
                                    flags: 0,
                                    req_path: path_handler//如果没有DecId，那么就当当前decid处理
                                },
                                // 目前只支持ChunkId/FileId/DirId
                                object_id: chunkId.calculate_id()
                                
                            }

                            let resp = await source.ndn_service().get_data(req)
                            console.info(`${chunkId} 下载结果：${resp}`)
                            if (resp.err) {
                                v({ err: true, log: `ndn_service get_data failed` })
                            }
                            //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                            console.info(`下载chunk 成功： ${JSON.stringify(resp)}`)
                            v({ err: false, chunkId: chunkId.calculate_id().to_base_58() })
                        }))
                        }
                        let download = []
                        for (let i in chunkRecvPromise) {
                        let result = await chunkRecvPromise[i]
                        if (result.err) {
                            return { err: result.err, log: result.log }
                        }
                        download.push(result)                        
                        }
                        //清理数据
                        await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                        
                        return { err: false, log: `chunk 下载成功`, download };
                    })
                    it("#NDN权限测试,objectmap_inner_path,get_data,File目标对象",async()=>{
                        //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1ood.fork_with_new_dec(DecId.DecIdA)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                         let res= (await trans_chunk_for_getdata(stack,filePath,"/" + fileName,chunkSize,level))
                         let chunkIdList = res[3]

                        //[object_map_id,file_id_from_objectmap,dir_id,chunkIdList]
                      
                        
                        //将file对象id挂在objet_map上
                        let file_id = res[1].object_id
                        console.info("remove_with_path", await op_env_stub_target.remove_with_path(acl_path))
                        let result1 = await op_env_stub_target.insert_with_path(acl_path, file_id)
                        console.info(`# insert_with_path_result1:${JSON.stringify(result1)}}`)
                        assert.ok(!result1.err)

                        let update_result2 = await op_env_stub_source.update()
                        console.info("update_result2",update_result2)
                        assert.ok(!update_result2.err)

                        let list_result1 = await op_env_stub_source.list(acl_path)
                        console.info("list_result1",list_result1)

                        //await op_env_stub_source.commit()
                        //调用get_data接口
                        let req: cyfs.NDNGetDataOutputRequest = {
                            common: {                                   
                                level: cyfs.NDNAPILevel.NDN,// api级别
                                dec_id: source.dec_id, //这里可以模拟当前dec_id
                                target: target.local_device_id().object_id,
                                // 需要处理数据的关联对象，主要用以chunk/file等+-
                                referer_object: [],
                                flags: 0,
                                req_path: path_handler//如果没有DecId，那么就当当前decid处理
                            },
                            // 目前只支持ChunkId/FileId/DirId
                            object_id: file_id
                            
                        }

                        let resp = await source.ndn_service().get_data(req)
                        console.info(`${file_id} 下载结果：${resp}`)
                        if (resp.err) {
                            console.info({ err: true, log: `ndn_service get_data failed` })
                        }
                        //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                        console.info(`下载file 成功： ${JSON.stringify(resp)}`)

                        //清理数据
                        await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                        
                        return { err: false, log: `file 下载成功`};
                    })
                    it("#NDN权限测试,objectmap_inner_path,get_data,File目标对象,来源对象objectmap_inner_path",async()=>{
                        //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1ood.fork_with_new_dec(DecId.DecIdA)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                         let res= (await trans_chunk_for_getdata(stack,filePath,"/" + fileName,chunkSize,level))
                         let chunkIdList = res[3]
                        
                        //将file对象id挂在objet_map上
                        let file_id = res[1].object_id
                        console.info("remove_with_path", await op_env_stub_target.remove_with_path(acl_path))
                        let result1 = await op_env_stub_target.insert_with_path(acl_path, file_id)
                        console.info(`# insert_with_path_result1:${JSON.stringify(result1)}}`)
                        assert.ok(!result1.err)

                        let update_result2 = await op_env_stub_source.update()
                        console.info("update_result2",update_result2)
                        assert.ok(!update_result2.err)

                        let list_result1 = await op_env_stub_source.list(acl_path)
                        console.info("list_result1",list_result1)

                        //await op_env_stub_source.commit()
                        //调用get_data接口
                        let req: cyfs.NDNGetDataOutputRequest = {
                            common: {                                   
                                level: cyfs.NDNAPILevel.NDN,// api级别
                                dec_id: source.dec_id, //这里可以模拟当前dec_id
                                target: target.local_device_id().object_id,
                                // 需要处理数据的关联对象，主要用以chunk/file等+-
                                referer_object: [new cyfs.NDNDataRefererObject(undefined,res[0].object_id,"/" + fileName)],
                                flags: 0,
                                req_path: path_handler//如果没有DecId，那么就当当前decid处理
                            },
                            // 目前只支持ChunkId/FileId/DirId
                            object_id: file_id
                            
                        }

                        let resp = await source.ndn_service().get_data(req)
                        console.info(`${file_id} 下载结果：${resp}`)
                        if (resp.err) {
                            console.info({ err: true, log: `ndn_service get_data failed` })
                        }
                        //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                        console.info(`下载file 成功： ${JSON.stringify(resp)}`)

                        //清理数据
                        await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                        
                        return { err: false, log: `file 下载成功`};
                    })
                    it("#NDN权限测试,objectmap_inner_path,get_data,objectmap_inner_path目标对象",async()=>{
                        //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1ood.fork_with_new_dec(DecId.DecIdA)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                         let res= (await trans_chunk_for_getdata(stack,filePath,"/" + fileName,chunkSize,level))
                         let chunkIdList = res[3]
                        
                        //将file对象id挂在objet_map上
                        let file_id = res[1].object_id
                        console.info("remove_with_path", await op_env_stub_target.remove_with_path(acl_path))
                        let result1 = await op_env_stub_target.insert_with_path(acl_path, file_id)
                        console.info(`# insert_with_path_result1:${JSON.stringify(result1)}}`)
                        assert.ok(!result1.err)

                        let update_result2 = await op_env_stub_source.update()
                        console.info("update_result2",update_result2)
                        assert.ok(!update_result2.err)

                        let list_result1 = await op_env_stub_source.list(acl_path)
                        console.info("list_result1",list_result1)

                        //await op_env_stub_source.commit()
                        //调用get_data接口
                        let req: cyfs.NDNGetDataOutputRequest = {
                            common: {                                   
                                level: cyfs.NDNAPILevel.NDN,// api级别
                                dec_id: source.dec_id, //这里可以模拟当前dec_id
                                target: target.local_device_id().object_id,
                                // 需要处理数据的关联对象，主要用以chunk/file等+-
                                referer_object: [],
                                flags: 0,
                                req_path: path_handler//如果没有DecId，那么就当当前decid处理
                            },
                            // 目前只支持ChunkId/FileId/DirId
                            inner_path: "/" + fileName,
                            object_id: res[0].object_id
                            
                        }

                        let resp = await source.ndn_service().get_data(req)
                        console.info(`${file_id} 下载结果：${resp}`)
                        if (resp.err) {
                            console.info({ err: true, log: `ndn_service get_data failed` })
                        }
                        //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                        console.info(`下载file 成功： ${JSON.stringify(resp)}`)

                        //清理数据
                        await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                        
                        return { err: false, log: `file 下载成功`};
                    
                    })
                })
                describe("#NDN权限测试,objectmap_inner_path,trans_createtask",async()=>{
                    it("#NDN权限测试,objectmap_inner_path,trans_createtask,chunk目标对象",async()=>{
                                               //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1ood.fork_with_new_dec(DecId.DecIdB)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        let savePath = path.join(__dirname, "./chunk_trans/target/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let root_path = "/123/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 10 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                        let res= (await trans_file_for_task(stack,filePath,"\\" + fileName,chunkSize,level))
                        let chunkIdList = res[1]
                        
                        //将file对象id挂在objet_map上
                        let file_id = res[0]
                        console.info("res_file_id",file_id)
                         
                        //从target设备get 对象数据
                        console.log("chunkIdList_length",chunkIdList!.length)
                        let chunkRecvPromise: Array<any> = []
                        for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                            console.log("chunkIdList_i_ ", i)
                            chunkRecvPromise.push(new Promise(async (v) => {
                     
                                let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                                console.info(`开始传输chunk:${chunkId},${buff}`)

                                //将chunkid对象id挂在objet_map上
                                //4. target 设备 start_task 开始下载文件
                                
                                let create_task = (await source.trans().create_task({
                                    common: {
                                        level: cyfs.NDNAPILevel.NDN,
                                        flags: 0,
                                        dec_id: source.dec_id,
                                        target: target.local_device_id().object_id,
                                        //referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)]
                                        referer_object: []
                                    },
                                    //不支持DirId,支持ChunkId/FileId
                                    object_id: chunkId.calculate_id(),
                                    local_path: savePath +"\\" + fileName,
                                    device_list: [target.local_device_id()],
                                    auto_start: true
                                })).unwrap()
                                let sleepTime = 50;
                                console.log("create_task_id",JSON.stringify(create_task.task_id))
                            
                                //5. target 设备 get_task_state 检查下载状态
                                let check: Promise<{ err: boolean, log: string, fileId?: string}> = new Promise(async (v) => {
                                    setTimeout(() => {
                                        console.info(`下载文件超时`)
                                        v({ err: true, log: `下载文件超时：${chunkId.calculate_id()}` })
                                    }, timeout)
                                    while (true) {
                                        console.log(`${savePath}`);
                                        const resp = (await source.trans().get_task_state({
                                            common: {
                                                level: cyfs.NDNAPILevel.NDC,
                                                flags: 0,
                                                dec_id: source.dec_id,
                                                target: source.local_device_id().object_id,
                                                req_path: "",
                                                referer_object: []

                                            },
                                            task_id: create_task.task_id
                                        })).unwrap();
                                        console.log("get task status", JSON.stringify(resp.state));
                                        if (resp.state === cyfs.TransTaskState.Finished) {
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
                                
                                
                                    v({ err: false, log: `下载文件成功：${chunkId.calculate_id()}` })
                                })       
                                //let result = await check;
                                //return result
                            }))}
                            let download = []
                            for (let i in chunkRecvPromise) {
                                let result = await chunkRecvPromise[i]
                            if (result.err) {
                                return { err: result.err, log: result.log }
                            }
                            download.push(result)                        
                            }
                        
                        //清理数据
                        //await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)   
                    })
                    it("#NDN权限测试,objectmap_inner_path,trans_createtask,chunk目标对象,来源对象file",async()=>{
                                               //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1ood.fork_with_new_dec(DecId.DecIdB)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        let savePath = path.join(__dirname, "./chunk_trans/target/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let root_path = "/123/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 10 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                        let res= (await trans_file_for_task(stack,filePath,"\\" + fileName,chunkSize,level))
                        let chunkIdList = res[1]
                        
                        //将file对象id挂在objet_map上
                        let file_id = res[0]
                        console.info("res_file_id",file_id)
                         
                        //从target设备get 对象数据
                        console.log("chunkIdList_length",chunkIdList!.length)
                        let chunkRecvPromise: Array<any> = []
                        for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                            console.log("chunkIdList_i_ ", i)
                            chunkRecvPromise.push(new Promise(async (v) => {
                     
                                let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                                console.info(`开始传输chunk:${chunkId},${buff}`)

                                //将chunkid对象id挂在objet_map上
                                //4. target 设备 start_task 开始下载文件
                                
                                let create_task = (await source.trans().create_task({
                                    common: {
                                        level: cyfs.NDNAPILevel.NDN,
                                        flags: 0,
                                        dec_id: source.dec_id,
                                        target: target.local_device_id().object_id,
                                        //referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)]
                                        referer_object: []
                                    },
                                    //不支持DirId,支持ChunkId/FileId
                                    object_id: chunkId.calculate_id(),
                                    local_path: savePath +"\\" + fileName,
                                    device_list: [target.local_device_id()],
                                    auto_start: true
                                })).unwrap()
                                let sleepTime = 50;
                                console.log("create_task_id",JSON.stringify(create_task.task_id))
                            
                                //5. target 设备 get_task_state 检查下载状态
                                let check: Promise<{ err: boolean, log: string, fileId?: string}> = new Promise(async (v) => {
                                    setTimeout(() => {
                                        console.info(`下载文件超时`)
                                        v({ err: true, log: `下载文件超时：${chunkId.calculate_id()}` })
                                    }, timeout)
                                    while (true) {
                                        console.log(`${savePath}`);
                                        const resp = (await source.trans().get_task_state({
                                            common: {
                                                level: cyfs.NDNAPILevel.NDC,
                                                flags: 0,
                                                dec_id: source.dec_id,
                                                target: source.local_device_id().object_id,
                                                req_path: "",
                                                referer_object: []

                                            },
                                            task_id: create_task.task_id
                                        })).unwrap();
                                        console.log("get task status", JSON.stringify(resp.state));
                                        if (resp.state === cyfs.TransTaskState.Finished) {
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
                                
                                
                                    v({ err: false, log: `下载文件成功：${chunkId.calculate_id()}` })
                                })       
                                //let result = await check;
                                //return result
                            }))}
                            let download = []
                            for (let i in chunkRecvPromise) {
                                let result = await chunkRecvPromise[i]
                            if (result.err) {
                                return { err: result.err, log: result.log }
                            }
                            download.push(result)                        
                            }
                        
                        //清理数据
                        //await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)   
                    })
                    it("#NDN权限测试,objectmap_inner_path,trans_createtask,chunk目标对象,来源对象dir",async()=>{
                                               //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1ood.fork_with_new_dec(DecId.DecIdB)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        let savePath = path.join(__dirname, "./chunk_trans/target/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let root_path = "/123/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 10 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                        let res= (await trans_file_for_task(stack,filePath,"\\" + fileName,chunkSize,level))
                        let chunkIdList = res[1]
                        
                        //将file对象id挂在objet_map上
                        let file_id = res[0]
                        console.info("res_file_id",file_id)
                         
                        //从target设备get 对象数据
                        console.log("chunkIdList_length",chunkIdList!.length)
                        let chunkRecvPromise: Array<any> = []
                        for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                            console.log("chunkIdList_i_ ", i)
                            chunkRecvPromise.push(new Promise(async (v) => {
                     
                                let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                                console.info(`开始传输chunk:${chunkId},${buff}`)

                                //将chunkid对象id挂在objet_map上
                                //4. target 设备 start_task 开始下载文件
                                
                                let create_task = (await source.trans().create_task({
                                    common: {
                                        level: cyfs.NDNAPILevel.NDN,
                                        flags: 0,
                                        dec_id: source.dec_id,
                                        target: target.local_device_id().object_id,
                                        //referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)]
                                        referer_object: []
                                    },
                                    //不支持DirId,支持ChunkId/FileId
                                    object_id: chunkId.calculate_id(),
                                    local_path: savePath +"\\" + fileName,
                                    device_list: [target.local_device_id()],
                                    auto_start: true
                                })).unwrap()
                                let sleepTime = 50;
                                console.log("create_task_id",JSON.stringify(create_task.task_id))
                            
                                //5. target 设备 get_task_state 检查下载状态
                                let check: Promise<{ err: boolean, log: string, fileId?: string}> = new Promise(async (v) => {
                                    setTimeout(() => {
                                        console.info(`下载文件超时`)
                                        v({ err: true, log: `下载文件超时：${chunkId.calculate_id()}` })
                                    }, timeout)
                                    while (true) {
                                        console.log(`${savePath}`);
                                        const resp = (await source.trans().get_task_state({
                                            common: {
                                                level: cyfs.NDNAPILevel.NDC,
                                                flags: 0,
                                                dec_id: source.dec_id,
                                                target: source.local_device_id().object_id,
                                                req_path: "",
                                                referer_object: []

                                            },
                                            task_id: create_task.task_id
                                        })).unwrap();
                                        console.log("get task status", JSON.stringify(resp.state));
                                        if (resp.state === cyfs.TransTaskState.Finished) {
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
                                
                                
                                    v({ err: false, log: `下载文件成功：${chunkId.calculate_id()}` })
                                })       
                                //let result = await check;
                                //return result
                            }))}
                            let download = []
                            for (let i in chunkRecvPromise) {
                                let result = await chunkRecvPromise[i]
                            if (result.err) {
                                return { err: result.err, log: result.log }
                            }
                            download.push(result)                        
                            }
                        
                        //清理数据
                        //await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)   
                    })
                    it("#NDN权限测试,objectmap_inner_path,trans_createtask,chunk目标对象,来源对象objectmap+inner_path",async()=>{
                                               //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1ood.fork_with_new_dec(DecId.DecIdB)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        let savePath = path.join(__dirname, "./chunk_trans/target/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let root_path = "/123/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 10 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                        let res= (await trans_file_for_task(stack,filePath,"\\" + fileName,chunkSize,level))
                        let chunkIdList = res[1]
                        
                        //将file对象id挂在objet_map上
                        let file_id = res[0]
                        console.info("res_file_id",file_id)
                         
                        //从target设备get 对象数据
                        console.log("chunkIdList_length",chunkIdList!.length)
                        let chunkRecvPromise: Array<any> = []
                        for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                            console.log("chunkIdList_i_ ", i)
                            chunkRecvPromise.push(new Promise(async (v) => {
                     
                                let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                                console.info(`开始传输chunk:${chunkId},${buff}`)

                                //将chunkid对象id挂在objet_map上
                                //4. target 设备 start_task 开始下载文件
                                
                                let create_task = (await source.trans().create_task({
                                    common: {
                                        level: cyfs.NDNAPILevel.NDN,
                                        flags: 0,
                                        dec_id: source.dec_id,
                                        target: target.local_device_id().object_id,
                                        //referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)]
                                        referer_object: []
                                    },
                                    //不支持DirId,支持ChunkId/FileId
                                    object_id: chunkId.calculate_id(),
                                    local_path: savePath +"\\" + fileName,
                                    device_list: [target.local_device_id()],
                                    auto_start: true
                                })).unwrap()
                                let sleepTime = 50;
                                console.log("create_task_id",JSON.stringify(create_task.task_id))
                            
                                //5. target 设备 get_task_state 检查下载状态
                                let check: Promise<{ err: boolean, log: string, fileId?: string}> = new Promise(async (v) => {
                                    setTimeout(() => {
                                        console.info(`下载文件超时`)
                                        v({ err: true, log: `下载文件超时：${chunkId.calculate_id()}` })
                                    }, timeout)
                                    while (true) {
                                        console.log(`${savePath}`);
                                        const resp = (await source.trans().get_task_state({
                                            common: {
                                                level: cyfs.NDNAPILevel.NDC,
                                                flags: 0,
                                                dec_id: source.dec_id,
                                                target: source.local_device_id().object_id,
                                                req_path: "",
                                                referer_object: []

                                            },
                                            task_id: create_task.task_id
                                        })).unwrap();
                                        console.log("get task status", JSON.stringify(resp.state));
                                        if (resp.state === cyfs.TransTaskState.Finished) {
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
                                
                                
                                    v({ err: false, log: `下载文件成功：${chunkId.calculate_id()}` })
                                })       
                                //let result = await check;
                                //return result
                            }))}
                            let download = []
                            for (let i in chunkRecvPromise) {
                                let result = await chunkRecvPromise[i]
                            if (result.err) {
                                return { err: result.err, log: result.log }
                            }
                            download.push(result)                        
                            }
                        
                        //清理数据
                        //await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)   
                    })
                    it("#NDN权限测试,objectmap_inner_path,trans_createtask,File目标对象",async()=>{
                                               //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1ood.fork_with_new_dec(DecId.DecIdB)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        let savePath = path.join(__dirname, "./chunk_trans/target/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let root_path = "/123/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 10 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                        let res= (await trans_file_for_task(stack,filePath,"\\" + fileName,chunkSize,level))
                        let chunkIdList = res[1]
                        
                        //将file对象id挂在objet_map上
                        let file_id = res[0]
                        console.info("res_file_id",file_id)
                         
                        //从target设备get 对象数据
                        console.log("chunkIdList_length",chunkIdList!.length)
                        let chunkRecvPromise: Array<any> = []
                        for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                            console.log("chunkIdList_i_ ", i)
                            chunkRecvPromise.push(new Promise(async (v) => {
                     
                                let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                                console.info(`开始传输chunk:${chunkId},${buff}`)

                                //将chunkid对象id挂在objet_map上
                                //4. target 设备 start_task 开始下载文件
                                
                                let create_task = (await source.trans().create_task({
                                    common: {
                                        level: cyfs.NDNAPILevel.NDN,
                                        flags: 0,
                                        dec_id: source.dec_id,
                                        target: target.local_device_id().object_id,
                                        //referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)]
                                        referer_object: []
                                    },
                                    //不支持DirId,支持ChunkId/FileId
                                    object_id: chunkId.calculate_id(),
                                    local_path: savePath +"\\" + fileName,
                                    device_list: [target.local_device_id()],
                                    auto_start: true
                                })).unwrap()
                                let sleepTime = 50;
                                console.log("create_task_id",JSON.stringify(create_task.task_id))
                            
                                //5. target 设备 get_task_state 检查下载状态
                                let check: Promise<{ err: boolean, log: string, fileId?: string}> = new Promise(async (v) => {
                                    setTimeout(() => {
                                        console.info(`下载文件超时`)
                                        v({ err: true, log: `下载文件超时：${chunkId.calculate_id()}` })
                                    }, timeout)
                                    while (true) {
                                        console.log(`${savePath}`);
                                        const resp = (await source.trans().get_task_state({
                                            common: {
                                                level: cyfs.NDNAPILevel.NDC,
                                                flags: 0,
                                                dec_id: source.dec_id,
                                                target: source.local_device_id().object_id,
                                                req_path: "",
                                                referer_object: []

                                            },
                                            task_id: create_task.task_id
                                        })).unwrap();
                                        console.log("get task status", JSON.stringify(resp.state));
                                        if (resp.state === cyfs.TransTaskState.Finished) {
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
                                
                                
                                    v({ err: false, log: `下载文件成功：${chunkId.calculate_id()}` })
                                })       
                                //let result = await check;
                                //return result
                            }))}
                            let download = []
                            for (let i in chunkRecvPromise) {
                                let result = await chunkRecvPromise[i]
                            if (result.err) {
                                return { err: result.err, log: result.log }
                            }
                            download.push(result)                        
                            }
                        
                        //清理数据
                        //await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)   
                    })
                    it("#NDN权限测试,objectmap_inner_path,trans_createtask,File目标对象,来源对象objectmap_inner_path",async()=>{
                                               //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1ood.fork_with_new_dec(DecId.DecIdB)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        let savePath = path.join(__dirname, "./chunk_trans/target/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let root_path = "/123/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 10 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                        let res= (await trans_file_for_task(stack,filePath,"\\" + fileName,chunkSize,level))
                        let chunkIdList = res[1]
                        
                        //将file对象id挂在objet_map上
                        let file_id = res[0]
                        console.info("res_file_id",file_id)
                         
                        //从target设备get 对象数据
                        console.log("chunkIdList_length",chunkIdList!.length)
                        let chunkRecvPromise: Array<any> = []
                        for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                            console.log("chunkIdList_i_ ", i)
                            chunkRecvPromise.push(new Promise(async (v) => {
                     
                                let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                                console.info(`开始传输chunk:${chunkId},${buff}`)

                                //将chunkid对象id挂在objet_map上
                                //4. target 设备 start_task 开始下载文件
                                
                                let create_task = (await source.trans().create_task({
                                    common: {
                                        level: cyfs.NDNAPILevel.NDN,
                                        flags: 0,
                                        dec_id: source.dec_id,
                                        target: target.local_device_id().object_id,
                                        //referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)]
                                        referer_object: []
                                    },
                                    //不支持DirId,支持ChunkId/FileId
                                    object_id: chunkId.calculate_id(),
                                    local_path: savePath +"\\" + fileName,
                                    device_list: [target.local_device_id()],
                                    auto_start: true
                                })).unwrap()
                                let sleepTime = 50;
                                console.log("create_task_id",JSON.stringify(create_task.task_id))
                            
                                //5. target 设备 get_task_state 检查下载状态
                                let check: Promise<{ err: boolean, log: string, fileId?: string}> = new Promise(async (v) => {
                                    setTimeout(() => {
                                        console.info(`下载文件超时`)
                                        v({ err: true, log: `下载文件超时：${chunkId.calculate_id()}` })
                                    }, timeout)
                                    while (true) {
                                        console.log(`${savePath}`);
                                        const resp = (await source.trans().get_task_state({
                                            common: {
                                                level: cyfs.NDNAPILevel.NDC,
                                                flags: 0,
                                                dec_id: source.dec_id,
                                                target: source.local_device_id().object_id,
                                                req_path: "",
                                                referer_object: []

                                            },
                                            task_id: create_task.task_id
                                        })).unwrap();
                                        console.log("get task status", JSON.stringify(resp.state));
                                        if (resp.state === cyfs.TransTaskState.Finished) {
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
                                
                                
                                    v({ err: false, log: `下载文件成功：${chunkId.calculate_id()}` })
                                })       
                                //let result = await check;
                                //return result
                            }))}
                            let download = []
                            for (let i in chunkRecvPromise) {
                                let result = await chunkRecvPromise[i]
                            if (result.err) {
                                return { err: result.err, log: result.log }
                            }
                            download.push(result)                        
                            }
                        
                        //清理数据
                        //await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)   
                    })
                })

            })
            describe("#NDN权限测试,objectmap_inner_path,同zone不同dec",async()=>{
                describe("#NDN权限测试,objectmap_inner_path,getdata",async()=>{
                    //this.beforeEach(function(){});
                    //this.afterEach(function(){});
                    it("#NDN权限测试,objectmap_inner_path,getdata,chunk目标对象",async()=>{
                        //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1ood.fork_with_new_dec(DecId.DecIdB)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let root_path = "/123/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                         let res= (await trans_chunk_for_getdata(stack,filePath,"/" + fileName,chunkSize,level))
                         let chunkIdList = res[3]
                         

                        //从target设备get 对象数据
                        console.log("chunkIdList",chunkIdList)
                        let chunkRecvPromise: Array<any> = []
                        for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                            console.log("chunkIdList_i_ ", i)
                            chunkRecvPromise.push(new Promise(async (v) => {

                            setTimeout(() => {v({ err: true, log: `ndn_service get_data timeout` })}, timeout)                       
                            let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                            console.info(`开始传输chunk:${chunkId},${buff}`)

                            //将chunkid对象id挂在objet_map上
                            console.info("remove_with_path", await op_env_stub_target.remove_with_path(acl_path))
                            let result1 = await op_env_stub_target.insert_with_path(acl_path, chunkId.calculate_id())
                            console.info(`# insert_with_path_result1:${JSON.stringify(result1)}}`)
                            assert.ok(!result1.err)

                            let update_result2 = await op_env_stub_source.update()
                            console.info("update_result2",update_result2)
                            assert.ok(!update_result2.err)

                            let list_result1 = await op_env_stub_source.list(acl_path)
                            console.info("list_result1",list_result1)



                            //await op_env_stub_source.commit()
                            //调用get_data接口
                            let req: cyfs.NDNGetDataOutputRequest = {
                                common: {                                   
                                    level: cyfs.NDNAPILevel.NDN,// api级别
                                    dec_id: source.dec_id, //这里可以模拟当前dec_id
                                    target: target.local_device_id().object_id,
                                    // 需要处理数据的关联对象，主要用以chunk/file等+-
                                    referer_object: [],
                                    flags: 0,
                                    req_path: path_handler//如果没有DecId，那么就当当前decid处理
                                },
                                // 目前只支持ChunkId/FileId/DirId
                                object_id: chunkId.calculate_id()
                                
                            }

                            let resp = await source.ndn_service().get_data(req)
                            console.info(`${chunkId} 下载结果：${resp}`)
                            if (resp.err) {
                                v({ err: true, log: `ndn_service get_data failed` })
                            }
                            //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                            console.info(`下载chunk 成功： ${JSON.stringify(resp)}`)
                            v({ err: false, chunkId: chunkId.calculate_id().to_base_58() })
                        }))
                        }
                        let download = []
                        for (let i in chunkRecvPromise) {
                        let result = await chunkRecvPromise[i]
                        if (result.err) {
                            return { err: result.err, log: result.log }
                        }
                        download.push(result)                        
                        }
                        //清理数据
                        await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                        
                        return { err: false, log: `chunk 下载成功`, download };
                    })
                    it("#NDN权限测试,objectmap_inner_path,get_data,chunk目标对象,来源对象file",async()=>{
                          //stack
                          let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                          let target = zone1ood.fork_with_new_dec(DecId.DecIdB)
  
                          //test conf
                          let fileName = RandomGenerator.string(10);
                          let filePath = path.join(__dirname, "./chunk_trans/source/")
                          console.log("filePath",filePath)
                          let chunkSize = 4 * 1024 * 1024
                          let chunkNumber = 10
                          let timeout: number = 600 * 1000                
                          let acl_path = "/test/api/test/"
                          let decid = target.dec_id
  
                          //create test file
                          await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);
  
                          //acl
                          await source.root_state_meta_stub(undefined,undefined).clear_access()
                          await target.root_state_meta_stub(undefined,undefined).clear_access()
                          await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                          await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
  
                          //rmeta
                          let stub_source = source.root_state_stub(undefined,undefined)
                          let stub_target = target.root_state_stub(undefined,undefined)
  
                          let env_acc:cyfs.RootStateOpEnvAccess = {
                          path:acl_path,
                          access:cyfs.AccessPermissions.Full 
                          }
      
                          //vaildate
                          let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()
  
                          let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                          let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                          
                          //初始化数据
                          let stack = [source,source,source,source,source,source,source,source,source,source]
                          let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                           let res= (await trans_chunk_for_getdata(stack,filePath,"/" + fileName,chunkSize,level))
                           let chunkIdList = res[3]
                           
  
                          //从target设备get 对象数据
                          console.log("chunkIdList",chunkIdList)
                          let chunkRecvPromise: Array<any> = []
                          for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                              console.log("chunkIdList_i_ ", i)
                              chunkRecvPromise.push(new Promise(async (v) => {
  
                              setTimeout(() => {v({ err: true, log: `ndn_service get_data timeout` })}, timeout)                       
                              let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                              console.info(`开始传输chunk:${chunkId},${buff}`)
  
                              //将chunkid对象id挂在objet_map上
                              console.info("remove_with_path", await op_env_stub_target.remove_with_path(acl_path))
                              let result1 = await op_env_stub_target.insert_with_path(acl_path, res[1].object_id)
                              console.info(`# insert_with_path_result1:${JSON.stringify(result1)}}`)
                              assert.ok(!result1.err)
  
                              let update_result2 = await op_env_stub_source.update()
                              console.info("update_result2",update_result2)
                              assert.ok(!update_result2.err)
  
                              let list_result1 = await op_env_stub_source.list(acl_path)
                              console.info("list_result1",list_result1)
  
  
  
                              //await op_env_stub_source.commit()
                              //调用get_data接口
                              let req: cyfs.NDNGetDataOutputRequest = {
                                  common: {                                   
                                      level: cyfs.NDNAPILevel.NDN,// api级别
                                      dec_id: source.dec_id, //这里可以模拟当前dec_id
                                      target: target.local_device_id().object_id,
                                      // 需要处理数据的关联对象，主要用以chunk/file等+-
                                      referer_object: [new cyfs.NDNDataRefererObject(undefined,res[1].object_id)],
                                      flags: 0,
                                      req_path: path_handler//如果没有DecId，那么就当当前decid处理
                                  },
                                  // 目前只支持ChunkId/FileId/DirId
                                  object_id: chunkId.calculate_id()
                                  
                              }
  
                              let resp = await source.ndn_service().get_data(req)
                              console.info(`${chunkId} 下载结果：${resp}`)
                              if (resp.err) {
                                  v({ err: true, log: `ndn_service get_data failed` })
                              }
                              //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                              console.info(`下载chunk 成功： ${JSON.stringify(resp)}`)
                              v({ err: false, chunkId: chunkId.calculate_id().to_base_58() })
                          }))
                          }
                          let download = []
                          for (let i in chunkRecvPromise) {
                          let result = await chunkRecvPromise[i]
                          if (result.err) {
                              return { err: result.err, log: result.log }
                          }
                          download.push(result)                        
                          }
                          //清理数据
                          await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                          
                          return { err: false, log: `chunk 下载成功`, download };
                    })
                    //需要增加chunkid与dir的关联
                    it("#NDN权限测试,objectmap_inner_path,get_data,chunk目标对象,来源对象dir",async()=>{
                         //stack
                         let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                         let target = zone1ood.fork_with_new_dec(DecId.DecIdB)
 
                         //test conf
                         let fileName = RandomGenerator.string(10);
                         let filePath = path.join(__dirname, "./chunk_trans/source/")
                         console.log("filePath",filePath)
                         let chunkSize = 4 * 1024 * 1024
                         let chunkNumber = 10
                         let timeout: number = 600 * 1000                
                         let acl_path = "/test/api/test/"
                         let decid = target.dec_id
 
                         //create test file
                         await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);
 
                         //acl
                         await source.root_state_meta_stub(undefined,undefined).clear_access()
                         await target.root_state_meta_stub(undefined,undefined).clear_access()
                         await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                         await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
 
                         //rmeta
                         let stub_source = source.root_state_stub(undefined,undefined)
                         let stub_target = target.root_state_stub(undefined,undefined)
 
                         let env_acc:cyfs.RootStateOpEnvAccess = {
                         path:acl_path,
                         access:cyfs.AccessPermissions.Full 
                         }
     
                         //vaildate
                         let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()
 
                         let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                         let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                         
                         //初始化数据
                         let stack = [source,source,source,source,source,source,source,source,source,source]
                         let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                          let res= (await trans_chunk_for_getdata(stack,filePath,"/" + fileName,chunkSize,level))
                          let chunkIdList = res[3]
                          
 
                         //从target设备get 对象数据
                         console.log("chunkIdList",chunkIdList)
                         let chunkRecvPromise: Array<any> = []
                         for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                             console.log("chunkIdList_i_ ", i)
                             chunkRecvPromise.push(new Promise(async (v) => {
 
                             setTimeout(() => {v({ err: true, log: `ndn_service get_data timeout` })}, timeout)                       
                             let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                             console.info(`开始传输chunk:${chunkId},${buff}`)
 
                             //将chunkid对象id挂在objet_map上
                             console.info("remove_with_path", await op_env_stub_target.remove_with_path(acl_path))
                             let result1 = await op_env_stub_target.insert_with_path(acl_path, res[1].object_id)
                             console.info(`# insert_with_path_result1:${JSON.stringify(result1)}}`)
                             assert.ok(!result1.err)
 
                             let update_result2 = await op_env_stub_source.update()
                             console.info("update_result2",update_result2)
                             assert.ok(!update_result2.err)
 
                             let list_result1 = await op_env_stub_source.list(acl_path)
                             console.info("list_result1",list_result1)
 
 
 
                             //await op_env_stub_source.commit()
                             //调用get_data接口
                             let req: cyfs.NDNGetDataOutputRequest = {
                                 common: {                                   
                                     level: cyfs.NDNAPILevel.NDN,// api级别
                                     dec_id: source.dec_id, //这里可以模拟当前dec_id
                                     target: target.local_device_id().object_id,
                                     // 需要处理数据的关联对象，主要用以chunk/file等+-
                                     referer_object: [new cyfs.NDNDataRefererObject(undefined,res[1].object_id)],
                                     flags: 0,
                                     req_path: path_handler//如果没有DecId，那么就当当前decid处理
                                 },
                                 // 目前只支持ChunkId/FileId/DirId
                                 object_id: chunkId.calculate_id()
                                 
                             }
 
                             let resp = await source.ndn_service().get_data(req)
                             console.info(`${chunkId} 下载结果：${resp}`)
                             if (resp.err) {
                                 v({ err: true, log: `ndn_service get_data failed` })
                             }
                             //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                             console.info(`下载chunk 成功： ${JSON.stringify(resp)}`)
                             v({ err: false, chunkId: chunkId.calculate_id().to_base_58() })
                         }))
                         }
                         let download = []
                         for (let i in chunkRecvPromise) {
                         let result = await chunkRecvPromise[i]
                         if (result.err) {
                             return { err: result.err, log: result.log }
                         }
                         download.push(result)                        
                         }
                         //清理数据
                         await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                         
                         return { err: false, log: `chunk 下载成功`, download };

                    })
                    it("#NDN权限测试,objectmap_inner_path,get_data,chunk目标对象,来源对象objectmap+inner_path",async()=>{
                        //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1ood.fork_with_new_dec(DecId.DecIdB)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                         let res= (await trans_chunk_for_getdata(stack,filePath,"/" + fileName,chunkSize,level))
                         let chunkIdList = res[3]
                         

                        //从target设备get 对象数据
                        console.log("chunkIdList",chunkIdList)
                        let chunkRecvPromise: Array<any> = []
                        for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                            console.log("chunkIdList_i_ ", i)
                            chunkRecvPromise.push(new Promise(async (v) => {

                            setTimeout(() => {v({ err: true, log: `ndn_service get_data timeout` })}, timeout)                       
                            let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                            console.info(`开始传输chunk:${chunkId},${buff}`)

                            //将chunkid对象id挂在objet_map上
                            console.info("remove_with_path", await op_env_stub_target.remove_with_path(acl_path))
                            let result1 = await op_env_stub_target.insert_with_path(acl_path, res[1].object_id)
                            console.info(`# insert_with_path_result1:${JSON.stringify(result1)}}`)
                            assert.ok(!result1.err)

                            let update_result2 = await op_env_stub_source.update()
                            console.info("update_result2",update_result2)
                            assert.ok(!update_result2.err)

                            let list_result1 = await op_env_stub_source.list(acl_path)
                            console.info("list_result1",list_result1)



                            //await op_env_stub_source.commit()
                            //调用get_data接口
                            let req: cyfs.NDNGetDataOutputRequest = {
                                common: {                                   
                                    level: cyfs.NDNAPILevel.NDN,// api级别
                                    dec_id: source.dec_id, //这里可以模拟当前dec_id
                                    target: target.local_device_id().object_id,
                                    // 需要处理数据的关联对象，主要用以chunk/file等+-
                                    referer_object: [new cyfs.NDNDataRefererObject(undefined,res[0].object_id,"/" + fileName)],
                                    flags: 0,
                                    req_path: path_handler//如果没有DecId，那么就当当前decid处理
                                },
                                // 目前只支持ChunkId/FileId/DirId
                                object_id: chunkId.calculate_id()
                                
                            }

                            let resp = await source.ndn_service().get_data(req)
                            console.info(`${chunkId} 下载结果：${resp}`)
                            if (resp.err) {
                                v({ err: true, log: `ndn_service get_data failed` })
                            }
                            //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                            console.info(`下载chunk 成功： ${JSON.stringify(resp)}`)
                            v({ err: false, chunkId: chunkId.calculate_id().to_base_58() })
                        }))
                        }
                        let download = []
                        for (let i in chunkRecvPromise) {
                        let result = await chunkRecvPromise[i]
                        if (result.err) {
                            return { err: result.err, log: result.log }
                        }
                        download.push(result)                        
                        }
                        //清理数据
                        await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                        
                        return { err: false, log: `chunk 下载成功`, download };
                    })
                    it("#NDN权限测试,objectmap_inner_path,get_data,File目标对象",async()=>{
                        //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1ood.fork_with_new_dec(DecId.DecIdB)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                        let res= (await trans_chunk_for_getdata(stack,filePath,"/" + fileName,chunkSize,level))
                        let chunkIdList = res[3]
                      
                        //将file对象id挂在objet_map上
                        let file_id = res[1].object_id
                        console.info("remove_with_path", await op_env_stub_target.remove_with_path(acl_path))
                        let result1 = await op_env_stub_target.insert_with_path(acl_path, file_id)
                        console.info(`# insert_with_path_result1:${JSON.stringify(result1)}}`)
                        assert.ok(!result1.err)

                        let update_result2 = await op_env_stub_source.update()
                        console.info("update_result2",update_result2)
                        assert.ok(!update_result2.err)

                        let list_result1 = await op_env_stub_source.list(acl_path)
                        console.info("list_result1",list_result1)

                        //await op_env_stub_source.commit()
                        //调用get_data接口
                        let req: cyfs.NDNGetDataOutputRequest = {
                            common: {                                   
                                level: cyfs.NDNAPILevel.NDN,// api级别
                                dec_id: source.dec_id, //这里可以模拟当前dec_id
                                target: target.local_device_id().object_id,
                                // 需要处理数据的关联对象，主要用以chunk/file等+-
                                referer_object: [],
                                flags: 0,
                                req_path: path_handler//如果没有DecId，那么就当当前decid处理
                            },
                            // 目前只支持ChunkId/FileId/DirId
                            object_id: file_id
                            
                        }

                        let resp = await source.ndn_service().get_data(req)
                        console.info(`${file_id} 下载结果：${resp}`)
                        if (resp.err) {
                            console.info({ err: true, log: `ndn_service get_data failed` })
                        }
                        //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                        console.info(`下载file 成功： ${JSON.stringify(resp)}`)

                        //清理数据
                        await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                        
                        return { err: false, log: `file 下载成功`};
                    })
                    it("#NDN权限测试,objectmap_inner_path,get_data,File目标对象,来源对象objectmap_inner_path",async()=>{
                        //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1ood.fork_with_new_dec(DecId.DecIdB)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                        let res= (await trans_chunk_for_getdata(stack,filePath,"/" + fileName,chunkSize,level))
                        let chunkIdList = res[3]
                        
                        //将file对象id挂在objet_map上
                        let file_id = res[1].object_id
                        console.info("remove_with_path", await op_env_stub_target.remove_with_path(acl_path))
                        let result1 = await op_env_stub_target.insert_with_path(acl_path, file_id)
                        console.info(`# insert_with_path_result1:${JSON.stringify(result1)}}`)
                        assert.ok(!result1.err)

                        let update_result2 = await op_env_stub_source.update()
                        console.info("update_result2",update_result2)
                        assert.ok(!update_result2.err)

                        let list_result1 = await op_env_stub_source.list(acl_path)
                        console.info("list_result1",list_result1)

                        //await op_env_stub_source.commit()
                        //调用get_data接口
                        let req: cyfs.NDNGetDataOutputRequest = {
                            common: {                                   
                                level: cyfs.NDNAPILevel.NDN,// api级别
                                dec_id: source.dec_id, //这里可以模拟当前dec_id
                                target: target.local_device_id().object_id,
                                // 需要处理数据的关联对象，主要用以chunk/file等+-
                                referer_object: [new cyfs.NDNDataRefererObject(undefined,res[0].object_id,"/" + fileName)],
                                flags: 0,
                                req_path: path_handler//如果没有DecId，那么就当当前decid处理
                            },
                            // 目前只支持ChunkId/FileId/DirId
                            object_id: file_id
                            
                        }

                        let resp = await source.ndn_service().get_data(req)
                        console.info(`${file_id} 下载结果：${resp}`)
                        if (resp.err) {
                            console.info({ err: true, log: `ndn_service get_data failed` })
                        }
                        //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                        console.info(`下载file 成功： ${JSON.stringify(resp)}`)

                        //清理数据
                        await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                        
                        return { err: false, log: `file 下载成功`};
                    })
                    it("#NDN权限测试,objectmap_inner_path,get_data,objectmap_inner_path目标对象",async()=>{
                        //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1ood.fork_with_new_dec(DecId.DecIdB)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                        let res= (await trans_chunk_for_getdata(stack,filePath,"/" + fileName,chunkSize,level))
                        let chunkIdList = res[3]
                        
                        //将file对象id挂在objet_map上
                        let file_id = res[1].object_id
                        console.info("remove_with_path", await op_env_stub_target.remove_with_path(acl_path))
                        let result1 = await op_env_stub_target.insert_with_path(acl_path, file_id)
                        console.info(`# insert_with_path_result1:${JSON.stringify(result1)}}`)
                        assert.ok(!result1.err)

                        let update_result2 = await op_env_stub_source.update()
                        console.info("update_result2",update_result2)
                        assert.ok(!update_result2.err)

                        let list_result1 = await op_env_stub_source.list(acl_path)
                        console.info("list_result1",list_result1)

                        //await op_env_stub_source.commit()
                        //调用get_data接口
                        let req: cyfs.NDNGetDataOutputRequest = {
                            common: {                                   
                                level: cyfs.NDNAPILevel.NDN,// api级别
                                dec_id: source.dec_id, //这里可以模拟当前dec_id
                                target: target.local_device_id().object_id,
                                // 需要处理数据的关联对象，主要用以chunk/file等+-
                                referer_object: [],
                                flags: 0,
                                req_path: path_handler//如果没有DecId，那么就当当前decid处理
                            },
                            // 目前只支持ChunkId/FileId/DirId
                            inner_path: "/" + fileName,
                            object_id: res[0].object_id
                            
                        }

                        let resp = await source.ndn_service().get_data(req)
                        console.info(`${file_id} 下载结果：${resp}`)
                        if (resp.err) {
                            console.info({ err: true, log: `ndn_service get_data failed` })
                        }
                        //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                        console.info(`下载file 成功： ${JSON.stringify(resp)}`)

                        //清理数据
                        await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                        
                        return { err: false, log: `file 下载成功`};
                    
                    })
                })
                describe.only("#NDN权限测试,objectmap_inner_path,trans_createtask",async()=>{
                    it.only("#NDN权限测试,objectmap_inner_path,trans_createtask,chunk目标对象",async()=>{
                        //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1ood.fork_with_new_dec(DecId.DecIdB)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        let savePath = path.join(__dirname, "./chunk_trans/target/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let root_path = "/123/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 10 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                        let res= (await trans_file_for_task(stack,filePath,"\\" + fileName,chunkSize,level))
                        let chunkIdList = res[1]
                        
                        //将file对象id挂在objet_map上
                        let file_id = res[0]
                        console.info("res_file_id",file_id)
                         
                        //从target设备get 对象数据
                        console.log("chunkIdList_length",chunkIdList!.length)
                        let chunkRecvPromise: Array<any> = []
                        for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                            console.log("chunkIdList_i_ ", i)
                            chunkRecvPromise.push(new Promise(async (v) => {
                     
                                let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                                console.info(`开始传输chunk:${chunkId},${buff}`)

                                //将chunkid对象id挂在objet_map上
                                //4. target 设备 start_task 开始下载文件
                                
                                let create_task = (await source.trans().create_task({
                                    common: {
                                        level: cyfs.NDNAPILevel.NDN,
                                        flags: 0,
                                        dec_id: source.dec_id,
                                        target: target.local_device_id().object_id,
                                        //referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)]
                                        referer_object: []
                                    },
                                    //不支持DirId,支持ChunkId/FileId
                                    object_id: chunkId.calculate_id(),
                                    local_path: savePath +"\\" + fileName,
                                    device_list: [target.local_device_id()],
                                    auto_start: true
                                })).unwrap()
                                let sleepTime = 50;
                                console.log("create_task_id",JSON.stringify(create_task.task_id))
                            
                                //5. target 设备 get_task_state 检查下载状态
                                let check: Promise<{ err: boolean, log: string, fileId?: string}> = new Promise(async (v) => {
                                    setTimeout(() => {
                                        console.info(`下载文件超时`)
                                        v({ err: true, log: `下载文件超时：${chunkId.calculate_id()}` })
                                    }, timeout)
                                    while (true) {
                                        console.log(`${savePath}`);
                                        const resp = (await source.trans().get_task_state({
                                            common: {
                                                level: cyfs.NDNAPILevel.NDC,
                                                flags: 0,
                                                dec_id: source.dec_id,
                                                target: source.local_device_id().object_id,
                                                req_path: "",
                                                referer_object: []

                                            },
                                            task_id: create_task.task_id
                                        })).unwrap();
                                        console.log("get task status", JSON.stringify(resp.state));
                                        if (resp.state === cyfs.TransTaskState.Finished) {
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
                                
                                
                                    v({ err: false, log: `下载文件成功：${chunkId.calculate_id()}` })
                                })       
                                //let result = await check;
                                //return result
                            }))}
                            let download = []
                            for (let i in chunkRecvPromise) {
                                let result = await chunkRecvPromise[i]
                            if (result.err) {
                                return { err: result.err, log: result.log }
                            }
                            download.push(result)                        
                            }
                        
                        //清理数据
                        //await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)                    
                        })
            
                    it("#NDN权限测试,objectmap_inner_path,trans_createtask,chunk目标对象,来源对象file",async()=>{
                                               //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1ood.fork_with_new_dec(DecId.DecIdB)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        let savePath = path.join(__dirname, "./chunk_trans/target/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let root_path = "/123/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 10 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                        let res= (await trans_file_for_task(stack,filePath,"\\" + fileName,chunkSize,level))
                        let chunkIdList = res[1]
                        
                        //将file对象id挂在objet_map上
                        let file_id = res[0]
                        console.info("res_file_id",file_id)
                         
                        //从target设备get 对象数据
                        console.log("chunkIdList_length",chunkIdList!.length)
                        let chunkRecvPromise: Array<any> = []
                        for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                            console.log("chunkIdList_i_ ", i)
                            chunkRecvPromise.push(new Promise(async (v) => {
                     
                                let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                                console.info(`开始传输chunk:${chunkId},${buff}`)

                                //将chunkid对象id挂在objet_map上
                                //4. target 设备 start_task 开始下载文件
                                
                                let create_task = (await source.trans().create_task({
                                    common: {
                                        level: cyfs.NDNAPILevel.NDN,
                                        flags: 0,
                                        dec_id: source.dec_id,
                                        target: target.local_device_id().object_id,
                                        //referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)]
                                        referer_object: []
                                    },
                                    //不支持DirId,支持ChunkId/FileId
                                    object_id: chunkId.calculate_id(),
                                    local_path: savePath +"\\" + fileName,
                                    device_list: [target.local_device_id()],
                                    auto_start: true
                                })).unwrap()
                                let sleepTime = 50;
                                console.log("create_task_id",JSON.stringify(create_task.task_id))
                            
                                //5. target 设备 get_task_state 检查下载状态
                                let check: Promise<{ err: boolean, log: string, fileId?: string}> = new Promise(async (v) => {
                                    setTimeout(() => {
                                        console.info(`下载文件超时`)
                                        v({ err: true, log: `下载文件超时：${chunkId.calculate_id()}` })
                                    }, timeout)
                                    while (true) {
                                        console.log(`${savePath}`);
                                        const resp = (await source.trans().get_task_state({
                                            common: {
                                                level: cyfs.NDNAPILevel.NDC,
                                                flags: 0,
                                                dec_id: source.dec_id,
                                                target: source.local_device_id().object_id,
                                                req_path: "",
                                                referer_object: []

                                            },
                                            task_id: create_task.task_id
                                        })).unwrap();
                                        console.log("get task status", JSON.stringify(resp.state));
                                        if (resp.state === cyfs.TransTaskState.Finished) {
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
                                
                                
                                    v({ err: false, log: `下载文件成功：${chunkId.calculate_id()}` })
                                })       
                                //let result = await check;
                                //return result
                            }))}
                            let download = []
                            for (let i in chunkRecvPromise) {
                                let result = await chunkRecvPromise[i]
                            if (result.err) {
                                return { err: result.err, log: result.log }
                            }
                            download.push(result)                        
                            }
                        
                        //清理数据
                        //await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)   
                    })
                    it("#NDN权限测试,objectmap_inner_path,trans_createtask,chunk目标对象,来源对象dir",async()=>{
                                               //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1ood.fork_with_new_dec(DecId.DecIdB)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        let savePath = path.join(__dirname, "./chunk_trans/target/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let root_path = "/123/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 10 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                        let res= (await trans_file_for_task(stack,filePath,"\\" + fileName,chunkSize,level))
                        let chunkIdList = res[1]
                        
                        //将file对象id挂在objet_map上
                        let file_id = res[0]
                        console.info("res_file_id",file_id)
                         
                        //从target设备get 对象数据
                        console.log("chunkIdList_length",chunkIdList!.length)
                        let chunkRecvPromise: Array<any> = []
                        for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                            console.log("chunkIdList_i_ ", i)
                            chunkRecvPromise.push(new Promise(async (v) => {
                     
                                let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                                console.info(`开始传输chunk:${chunkId},${buff}`)

                                //将chunkid对象id挂在objet_map上
                                //4. target 设备 start_task 开始下载文件
                                
                                let create_task = (await source.trans().create_task({
                                    common: {
                                        level: cyfs.NDNAPILevel.NDN,
                                        flags: 0,
                                        dec_id: source.dec_id,
                                        target: target.local_device_id().object_id,
                                        //referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)]
                                        referer_object: []
                                    },
                                    //不支持DirId,支持ChunkId/FileId
                                    object_id: chunkId.calculate_id(),
                                    local_path: savePath +"\\" + fileName,
                                    device_list: [target.local_device_id()],
                                    auto_start: true
                                })).unwrap()
                                let sleepTime = 50;
                                console.log("create_task_id",JSON.stringify(create_task.task_id))
                            
                                //5. target 设备 get_task_state 检查下载状态
                                let check: Promise<{ err: boolean, log: string, fileId?: string}> = new Promise(async (v) => {
                                    setTimeout(() => {
                                        console.info(`下载文件超时`)
                                        v({ err: true, log: `下载文件超时：${chunkId.calculate_id()}` })
                                    }, timeout)
                                    while (true) {
                                        console.log(`${savePath}`);
                                        const resp = (await source.trans().get_task_state({
                                            common: {
                                                level: cyfs.NDNAPILevel.NDC,
                                                flags: 0,
                                                dec_id: source.dec_id,
                                                target: source.local_device_id().object_id,
                                                req_path: "",
                                                referer_object: []

                                            },
                                            task_id: create_task.task_id
                                        })).unwrap();
                                        console.log("get task status", JSON.stringify(resp.state));
                                        if (resp.state === cyfs.TransTaskState.Finished) {
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
                                
                                
                                    v({ err: false, log: `下载文件成功：${chunkId.calculate_id()}` })
                                })       
                                //let result = await check;
                                //return result
                            }))}
                            let download = []
                            for (let i in chunkRecvPromise) {
                                let result = await chunkRecvPromise[i]
                            if (result.err) {
                                return { err: result.err, log: result.log }
                            }
                            download.push(result)                        
                            }
                        
                        //清理数据
                        //await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)   
                    })
                    it("#NDN权限测试,objectmap_inner_path,trans_createtask,chunk目标对象,来源对象objectmap+inner_path",async()=>{
                                               //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1ood.fork_with_new_dec(DecId.DecIdB)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        let savePath = path.join(__dirname, "./chunk_trans/target/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let root_path = "/123/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 10 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                        let res= (await trans_file_for_task(stack,filePath,"\\" + fileName,chunkSize,level))
                        let chunkIdList = res[1]
                        
                        //将file对象id挂在objet_map上
                        let file_id = res[0]
                        console.info("res_file_id",file_id)
                         
                        //从target设备get 对象数据
                        console.log("chunkIdList_length",chunkIdList!.length)
                        let chunkRecvPromise: Array<any> = []
                        for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                            console.log("chunkIdList_i_ ", i)
                            chunkRecvPromise.push(new Promise(async (v) => {
                     
                                let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                                console.info(`开始传输chunk:${chunkId},${buff}`)

                                //将chunkid对象id挂在objet_map上
                                //4. target 设备 start_task 开始下载文件
                                
                                let create_task = (await source.trans().create_task({
                                    common: {
                                        level: cyfs.NDNAPILevel.NDN,
                                        flags: 0,
                                        dec_id: source.dec_id,
                                        target: target.local_device_id().object_id,
                                        //referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)]
                                        referer_object: []
                                    },
                                    //不支持DirId,支持ChunkId/FileId
                                    object_id: chunkId.calculate_id(),
                                    local_path: savePath +"\\" + fileName,
                                    device_list: [target.local_device_id()],
                                    auto_start: true
                                })).unwrap()
                                let sleepTime = 50;
                                console.log("create_task_id",JSON.stringify(create_task.task_id))
                            
                                //5. target 设备 get_task_state 检查下载状态
                                let check: Promise<{ err: boolean, log: string, fileId?: string}> = new Promise(async (v) => {
                                    setTimeout(() => {
                                        console.info(`下载文件超时`)
                                        v({ err: true, log: `下载文件超时：${chunkId.calculate_id()}` })
                                    }, timeout)
                                    while (true) {
                                        console.log(`${savePath}`);
                                        const resp = (await source.trans().get_task_state({
                                            common: {
                                                level: cyfs.NDNAPILevel.NDC,
                                                flags: 0,
                                                dec_id: source.dec_id,
                                                target: source.local_device_id().object_id,
                                                req_path: "",
                                                referer_object: []

                                            },
                                            task_id: create_task.task_id
                                        })).unwrap();
                                        console.log("get task status", JSON.stringify(resp.state));
                                        if (resp.state === cyfs.TransTaskState.Finished) {
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
                                
                                
                                    v({ err: false, log: `下载文件成功：${chunkId.calculate_id()}` })
                                })       
                                //let result = await check;
                                //return result
                            }))}
                            let download = []
                            for (let i in chunkRecvPromise) {
                                let result = await chunkRecvPromise[i]
                            if (result.err) {
                                return { err: result.err, log: result.log }
                            }
                            download.push(result)                        
                            }
                        
                        //清理数据
                        //await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)   
                    })
                    it("#NDN权限测试,objectmap_inner_path,trans_createtask,File目标对象",async()=>{
                                               //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1ood.fork_with_new_dec(DecId.DecIdB)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        let savePath = path.join(__dirname, "./chunk_trans/target/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let root_path = "/123/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 10 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                        let res= (await trans_file_for_task(stack,filePath,"\\" + fileName,chunkSize,level))
                        let chunkIdList = res[1]
                        
                        //将file对象id挂在objet_map上
                        let file_id = res[0]
                        console.info("res_file_id",file_id)
                         
                        //从target设备get 对象数据
                        console.log("chunkIdList_length",chunkIdList!.length)
                        let chunkRecvPromise: Array<any> = []
                        for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                            console.log("chunkIdList_i_ ", i)
                            chunkRecvPromise.push(new Promise(async (v) => {
                     
                                let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                                console.info(`开始传输chunk:${chunkId},${buff}`)

                                //将chunkid对象id挂在objet_map上
                                //4. target 设备 start_task 开始下载文件
                                
                                let create_task = (await source.trans().create_task({
                                    common: {
                                        level: cyfs.NDNAPILevel.NDN,
                                        flags: 0,
                                        dec_id: source.dec_id,
                                        target: target.local_device_id().object_id,
                                        //referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)]
                                        referer_object: []
                                    },
                                    //不支持DirId,支持ChunkId/FileId
                                    object_id: chunkId.calculate_id(),
                                    local_path: savePath +"\\" + fileName,
                                    device_list: [target.local_device_id()],
                                    auto_start: true
                                })).unwrap()
                                let sleepTime = 50;
                                console.log("create_task_id",JSON.stringify(create_task.task_id))
                            
                                //5. target 设备 get_task_state 检查下载状态
                                let check: Promise<{ err: boolean, log: string, fileId?: string}> = new Promise(async (v) => {
                                    setTimeout(() => {
                                        console.info(`下载文件超时`)
                                        v({ err: true, log: `下载文件超时：${chunkId.calculate_id()}` })
                                    }, timeout)
                                    while (true) {
                                        console.log(`${savePath}`);
                                        const resp = (await source.trans().get_task_state({
                                            common: {
                                                level: cyfs.NDNAPILevel.NDC,
                                                flags: 0,
                                                dec_id: source.dec_id,
                                                target: source.local_device_id().object_id,
                                                req_path: "",
                                                referer_object: []

                                            },
                                            task_id: create_task.task_id
                                        })).unwrap();
                                        console.log("get task status", JSON.stringify(resp.state));
                                        if (resp.state === cyfs.TransTaskState.Finished) {
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
                                
                                
                                    v({ err: false, log: `下载文件成功：${chunkId.calculate_id()}` })
                                })       
                                //let result = await check;
                                //return result
                            }))}
                            let download = []
                            for (let i in chunkRecvPromise) {
                                let result = await chunkRecvPromise[i]
                            if (result.err) {
                                return { err: result.err, log: result.log }
                            }
                            download.push(result)                        
                            }
                        
                        //清理数据
                        //await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)   
                    })
                    it("#NDN权限测试,objectmap_inner_path,trans_createtask,File目标对象,来源对象objectmap_inner_path",async()=>{
                                               //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1ood.fork_with_new_dec(DecId.DecIdB)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        let savePath = path.join(__dirname, "./chunk_trans/target/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let root_path = "/123/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 10 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                        let res= (await trans_file_for_task(stack,filePath,"\\" + fileName,chunkSize,level))
                        let chunkIdList = res[1]
                        
                        //将file对象id挂在objet_map上
                        let file_id = res[0]
                        console.info("res_file_id",file_id)
                         
                        //从target设备get 对象数据
                        console.log("chunkIdList_length",chunkIdList!.length)
                        let chunkRecvPromise: Array<any> = []
                        for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                            console.log("chunkIdList_i_ ", i)
                            chunkRecvPromise.push(new Promise(async (v) => {
                     
                                let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                                console.info(`开始传输chunk:${chunkId},${buff}`)

                                //将chunkid对象id挂在objet_map上
                                //4. target 设备 start_task 开始下载文件
                                
                                let create_task = (await source.trans().create_task({
                                    common: {
                                        level: cyfs.NDNAPILevel.NDN,
                                        flags: 0,
                                        dec_id: source.dec_id,
                                        target: target.local_device_id().object_id,
                                        //referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)]
                                        referer_object: []
                                    },
                                    //不支持DirId,支持ChunkId/FileId
                                    object_id: chunkId.calculate_id(),
                                    local_path: savePath +"\\" + fileName,
                                    device_list: [target.local_device_id()],
                                    auto_start: true
                                })).unwrap()
                                let sleepTime = 50;
                                console.log("create_task_id",JSON.stringify(create_task.task_id))
                            
                                //5. target 设备 get_task_state 检查下载状态
                                let check: Promise<{ err: boolean, log: string, fileId?: string}> = new Promise(async (v) => {
                                    setTimeout(() => {
                                        console.info(`下载文件超时`)
                                        v({ err: true, log: `下载文件超时：${chunkId.calculate_id()}` })
                                    }, timeout)
                                    while (true) {
                                        console.log(`${savePath}`);
                                        const resp = (await source.trans().get_task_state({
                                            common: {
                                                level: cyfs.NDNAPILevel.NDC,
                                                flags: 0,
                                                dec_id: source.dec_id,
                                                target: source.local_device_id().object_id,
                                                req_path: "",
                                                referer_object: []

                                            },
                                            task_id: create_task.task_id
                                        })).unwrap();
                                        console.log("get task status", JSON.stringify(resp.state));
                                        if (resp.state === cyfs.TransTaskState.Finished) {
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
                                
                                
                                    v({ err: false, log: `下载文件成功：${chunkId.calculate_id()}` })
                                })       
                                //let result = await check;
                                //return result
                            }))}
                            let download = []
                            for (let i in chunkRecvPromise) {
                                let result = await chunkRecvPromise[i]
                            if (result.err) {
                                return { err: result.err, log: result.log }
                            }
                            download.push(result)                        
                            }
                        
                        //清理数据
                        //await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)   
                    })
                })
            })
        })
    })

    describe("#NDN权限测试,objectmap_inner_path 跨设备",function(){
        describe("#NDN权限测试,objectmap_inner_path,同zone",async()=>{
            describe("#NDN权限测试,objectmap_inner_path,同zone同dec",async()=>{
                describe("#NDN权限测试,objectmap_inner_path,getdata",async()=>{
                    //this.beforeEach(function(){});
                    //this.afterEach(function(){});
                    it("#NDN权限测试,objectmap_inner_path,getdata,chunk目标对象",async()=>{
                        //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1device1.fork_with_new_dec(DecId.DecIdA)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let root_path = "/123/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                         let res= (await trans_chunk_for_getdata(stack,filePath,"\\" + fileName,chunkSize,level))
                         let chunkIdList = res[3]
                         

                        //从target设备get 对象数据
                        console.log("chunkIdList",chunkIdList)
                        let chunkRecvPromise: Array<any> = []
                        for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                            console.log("chunkIdList_i_ ", i)
                            chunkRecvPromise.push(new Promise(async (v) => {

                            setTimeout(() => {v({ err: true, log: `ndn_service get_data timeout` })}, timeout)                       
                            let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                            console.info(`开始传输chunk:${chunkId},${buff}`)

                            //将chunkid对象id挂在objet_map上
                            console.info("remove_with_path", await op_env_stub_target.remove_with_path(acl_path))
                            let result1 = await op_env_stub_target.insert_with_path(acl_path, chunkId.calculate_id())
                            console.info(`# insert_with_path_result1:${JSON.stringify(result1)}}`)
                            assert.ok(!result1.err)

                            let update_result2 = await op_env_stub_source.update()
                            console.info("update_result2",update_result2)
                            assert.ok(!update_result2.err)

                            let list_result1 = await op_env_stub_source.list(acl_path)
                            console.info("list_result1",list_result1)


                            //await op_env_stub_source.commit()
                            //调用get_data接口
                            let req: cyfs.NDNGetDataOutputRequest = {
                                common: {                                   
                                    level: cyfs.NDNAPILevel.NDN,// api级别
                                    dec_id: source.dec_id, //这里可以模拟当前dec_id
                                    target: target.local_device_id().object_id,
                                    // 需要处理数据的关联对象，主要用以chunk/file等+-
                                    referer_object: [],
                                    flags: 0,
                                    req_path: path_handler//如果没有DecId，那么就当当前decid处理
                                },
                                // 目前只支持ChunkId/FileId/DirId
                                object_id: chunkId.calculate_id()
                                
                            }

                            let resp = await source.ndn_service().get_data(req)
                            console.info(`${chunkId} 下载结果：${resp}`)
                            if (resp.err) {
                                v({ err: true, log: `ndn_service get_data failed` })
                            }
                            //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                            console.info(`下载chunk 成功： ${JSON.stringify(resp)}`)
                            v({ err: false, chunkId: chunkId.calculate_id().to_base_58() })
                        }))
                        }
                        let download = []
                        for (let i in chunkRecvPromise) {
                            let result = await chunkRecvPromise[i]
                            if (result.err) {
                                return { err: result.err, log: result.log }
                        }
                        download.push(result)                        
                        }
                        //清理数据
                        await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                        
                        return { err: false, log: `chunk 下载成功`, download };
                    })
                    it("#NDN权限测试,objectmap_inner_path,get_data,chunk目标对象,来源对象file",async()=>{
                          //stack
                          let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                          let target = zone1device1.fork_with_new_dec(DecId.DecIdA)
  
                          //test conf
                          let fileName = RandomGenerator.string(10);
                          let filePath = path.join(__dirname, "./chunk_trans/source/")
                          console.log("filePath",filePath)
                          let chunkSize = 4 * 1024 * 1024
                          let chunkNumber = 10
                          let timeout: number = 600 * 1000                
                          let acl_path = "/test/api/test/"
                          let decid = target.dec_id
  
                          //create test file
                          await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);
  
                          //acl
                          await source.root_state_meta_stub(undefined,undefined).clear_access()
                          await target.root_state_meta_stub(undefined,undefined).clear_access()
                          await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                          await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
  
                          //rmeta
                          let stub_source = source.root_state_stub(undefined,undefined)
                          let stub_target = target.root_state_stub(undefined,undefined)
  
                          let env_acc:cyfs.RootStateOpEnvAccess = {
                          path:acl_path,
                          access:cyfs.AccessPermissions.Full 
                          }
      
                          //vaildate
                          let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()
  
                          let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                          let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                          
                          //初始化数据
                          let stack = [source,source,source,source,source,source,source,source,source,source]
                          let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                           let res= (await trans_chunk_for_getdata(stack,filePath,"\\" + fileName,chunkSize,level))
                           let chunkIdList = res[3]
                           //[object_map_id,file_id_from_objectmap,dir_id,chunkIdList]
                           
  
                          //从target设备get 对象数据
                          console.log("chunkIdList",chunkIdList)
                          let chunkRecvPromise: Array<any> = []
                          for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                              console.log("chunkIdList_i_ ", i)
                              chunkRecvPromise.push(new Promise(async (v) => {
  
                              setTimeout(() => {v({ err: true, log: `ndn_service get_data timeout` })}, timeout)                       
                              let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                              console.info(`开始传输chunk:${chunkId},${buff}`)
  
                              //将chunkid对象id挂在objet_map上
                              console.info("remove_with_path", await op_env_stub_target.remove_with_path(acl_path))
                              let result1 = await op_env_stub_target.insert_with_path(acl_path, res[1].object_id)
                              console.info(`# insert_with_path_result1:${JSON.stringify(result1)}}`)
                              assert.ok(!result1.err)
  
                              let update_result2 = await op_env_stub_source.update()
                              console.info("update_result2",update_result2)
                              assert.ok(!update_result2.err)
  
                              let list_result1 = await op_env_stub_source.list(acl_path)
                              console.info("list_result1",list_result1)
  
  
  
                              //await op_env_stub_source.commit()
                              //调用get_data接口
                              let req: cyfs.NDNGetDataOutputRequest = {
                                  common: {                                   
                                      level: cyfs.NDNAPILevel.NDN,// api级别
                                      dec_id: source.dec_id, //这里可以模拟当前dec_id
                                      target: target.local_device_id().object_id,
                                      // 需要处理数据的关联对象，主要用以chunk/file等+-
                                      referer_object: [new cyfs.NDNDataRefererObject(undefined,res[1].object_id)],
                                      flags: 0,
                                      req_path: path_handler//如果没有DecId，那么就当当前decid处理
                                  },
                                  // 目前只支持ChunkId/FileId/DirId
                                  object_id: chunkId.calculate_id()
                                  
                              }
  
                              let resp = await source.ndn_service().get_data(req)
                              console.info(`${chunkId} 下载结果：${resp}`)
                              if (resp.err) {
                                  v({ err: true, log: `ndn_service get_data failed` })
                              }
                              //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                              console.info(`下载chunk 成功： ${JSON.stringify(resp)}`)
                              v({ err: false, chunkId: chunkId.calculate_id().to_base_58() })
                          }))
                          }
                          let download = []
                          for (let i in chunkRecvPromise) {
                          let result = await chunkRecvPromise[i]
                          if (result.err) {
                              return { err: result.err, log: result.log }
                          }
                          download.push(result)                        
                          }
                          //清理数据
                          await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                          
                          return { err: false, log: `chunk 下载成功`, download };
                    })
                    //需要增加chunkid与dir的关联
                    it.skip("#NDN权限测试,objectmap_inner_path,get_data,chunk目标对象,来源对象dir",async()=>{
                         //stack
                         let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                         let target = zone1device1.fork_with_new_dec(DecId.DecIdA)
                         //test conf
                         let fileName = RandomGenerator.string(10);
                         let filePath = path.join(__dirname, "./chunk_trans/source/")
                         console.log("filePath",filePath)
                         let chunkSize = 4 * 1024 * 1024
                         let chunkNumber = 10
                         let timeout: number = 600 * 1000                
                         let acl_path = "/test/api/test/"
                         let decid = target.dec_id
 
                         //create test file
                         await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);
 
                         //acl
                         await source.root_state_meta_stub(undefined,undefined).clear_access()
                         await target.root_state_meta_stub(undefined,undefined).clear_access()
                         await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                         await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
 
                         //rmeta
                         let stub_source = source.root_state_stub(undefined,undefined)
                         let stub_target = target.root_state_stub(undefined,undefined)
 
                         let env_acc:cyfs.RootStateOpEnvAccess = {
                         path:acl_path,
                         access:cyfs.AccessPermissions.Full 
                         }
     
                         //vaildate
                         let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()
 
                         let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                         let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                         
                         //初始化数据
                         let stack = [source,source,source,source,source,source,source,source,source,source]
                         let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                          let res= (await trans_chunk_for_getdata(stack,filePath,"\\" + fileName,chunkSize,level))
                          let chunkIdList = res[3]
                          //[object_map_id,file_id_from_objectmap,dir_id,chunkIdList]
                          
 
                         //从target设备get 对象数据
                         console.log("chunkIdList",chunkIdList)
                         let chunkRecvPromise: Array<any> = []
                         for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                             console.log("chunkIdList_i_ ", i)
                             chunkRecvPromise.push(new Promise(async (v) => {
 
                             setTimeout(() => {v({ err: true, log: `ndn_service get_data timeout` })}, timeout)                       
                             let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                             console.info(`开始传输chunk:${chunkId},${buff}`)
 
                             //将chunkid对象id挂在objet_map上
                             console.info("remove_with_path", await op_env_stub_target.remove_with_path(acl_path))
                             let result1 = await op_env_stub_target.insert_with_path(acl_path, res[1].object_id)
                             console.info(`# insert_with_path_result1:${JSON.stringify(result1)}}`)
                             assert.ok(!result1.err)
 
                             let update_result2 = await op_env_stub_source.update()
                             console.info("update_result2",update_result2)
                             assert.ok(!update_result2.err)
 
                             let list_result1 = await op_env_stub_source.list(acl_path)
                             console.info("list_result1",list_result1)
 
 
 
                             //await op_env_stub_source.commit()
                             //调用get_data接口
                             let req: cyfs.NDNGetDataOutputRequest = {
                                 common: {                                   
                                     level: cyfs.NDNAPILevel.NDN,// api级别
                                     dec_id: source.dec_id, //这里可以模拟当前dec_id
                                     target: target.local_device_id().object_id,
                                     // 需要处理数据的关联对象，主要用以chunk/file等+-
                                     referer_object: [new cyfs.NDNDataRefererObject(undefined,res[1].object_id)],
                                     flags: 0,
                                     req_path: path_handler//如果没有DecId，那么就当当前decid处理
                                 },
                                 // 目前只支持ChunkId/FileId/DirId
                                 object_id: chunkId.calculate_id()
                                 
                             }
 
                             let resp = await source.ndn_service().get_data(req)
                             console.info(`${chunkId} 下载结果：${resp}`)
                             if (resp.err) {
                                 v({ err: true, log: `ndn_service get_data failed` })
                             }
                             //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                             console.info(`下载chunk 成功： ${JSON.stringify(resp)}`)
                             v({ err: false, chunkId: chunkId.calculate_id().to_base_58() })
                         }))
                         }
                         let download = []
                         for (let i in chunkRecvPromise) {
                         let result = await chunkRecvPromise[i]
                         if (result.err) {
                             return { err: result.err, log: result.log }
                         }
                         download.push(result)                        
                         }
                         //清理数据
                         await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                         
                         return { err: false, log: `chunk 下载成功`, download };

                    })
                    it("#NDN权限测试,objectmap_inner_path,get_data,chunk目标对象,来源对象objectmap+inner_path",async()=>{
                        //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1device1.fork_with_new_dec(DecId.DecIdA)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                         let res= (await trans_chunk_for_getdata(stack,filePath,"\\" + fileName,chunkSize,level))
                         let chunkIdList = res[3]
                         //[object_map_id,file_id_from_objectmap,dir_id,chunkIdList]
                         

                        //从target设备get 对象数据
                        console.log("chunkIdList",chunkIdList)
                        let chunkRecvPromise: Array<any> = []
                        for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                            console.log("chunkIdList_i_ ", i)
                            chunkRecvPromise.push(new Promise(async (v) => {

                            setTimeout(() => {v({ err: true, log: `ndn_service get_data timeout` })}, timeout)                       
                            let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                            console.info(`开始传输chunk:${chunkId},${buff}`)

                            //将chunkid对象id挂在objet_map上
                            console.info("remove_with_path", await op_env_stub_target.remove_with_path(acl_path))
                            let result1 = await op_env_stub_target.insert_with_path(acl_path, res[1].object_id)
                            console.info(`# insert_with_path_result1:${JSON.stringify(result1)}}`)
                            assert.ok(!result1.err)

                            let update_result2 = await op_env_stub_source.update()
                            console.info("update_result2",update_result2)
                            assert.ok(!update_result2.err)

                            let list_result1 = await op_env_stub_source.list(acl_path)
                            console.info("list_result1",list_result1)



                            //await op_env_stub_source.commit()
                            //调用get_data接口
                            let req: cyfs.NDNGetDataOutputRequest = {
                                common: {                                   
                                    level: cyfs.NDNAPILevel.NDN,// api级别
                                    dec_id: source.dec_id, //这里可以模拟当前dec_id
                                    target: target.local_device_id().object_id,
                                    // 需要处理数据的关联对象，主要用以chunk/file等+-
                                    referer_object: [new cyfs.NDNDataRefererObject(undefined,res[0].object_id,"/" + fileName)],
                                    flags: 0,
                                    req_path: path_handler//如果没有DecId，那么就当当前decid处理
                                },
                                // 目前只支持ChunkId/FileId/DirId
                                object_id: chunkId.calculate_id()
                                
                            }

                            let resp = await source.ndn_service().get_data(req)
                            console.info(`${chunkId} 下载结果：${resp}`)
                            if (resp.err) {
                                v({ err: true, log: `ndn_service get_data failed` })
                            }
                            //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                            console.info(`下载chunk 成功： ${JSON.stringify(resp)}`)
                            v({ err: false, chunkId: chunkId.calculate_id().to_base_58() })
                        }))
                        }
                        let download = []
                        for (let i in chunkRecvPromise) {
                        let result = await chunkRecvPromise[i]
                        if (result.err) {
                            return { err: result.err, log: result.log }
                        }
                        download.push(result)                        
                        }
                        //清理数据
                        await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                        
                        return { err: false, log: `chunk 下载成功`, download };
                    })
                    it("#NDN权限测试,objectmap_inner_path,get_data,File目标对象",async()=>{
                        //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1device1.fork_with_new_dec(DecId.DecIdA)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                        let res= (await trans_chunk_for_getdata(stack,filePath,"\\" + fileName,chunkSize,level))
                        let file_id = res[1].object_id
                        //[object_map_id,file_id_from_objectmap,dir_id,chunkIdList]
                      
                        //将file对象id挂在objet_map上
                        console.info("remove_with_path", await op_env_stub_target.remove_with_path(acl_path))
                        let result1 = await op_env_stub_target.insert_with_path(acl_path, file_id)
                        console.info(`# insert_with_path_result1:${JSON.stringify(result1)}}`)
                        assert.ok(!result1.err)

                        let update_result2 = await op_env_stub_source.update()
                        console.info("update_result2",update_result2)
                        assert.ok(!update_result2.err)

                        let list_result1 = await op_env_stub_source.list(acl_path)
                        console.info("list_result1",list_result1)

                        //await op_env_stub_source.commit()
                        //调用get_data接口
                        let req: cyfs.NDNGetDataOutputRequest = {
                            common: {                                   
                                level: cyfs.NDNAPILevel.NDN,// api级别
                                dec_id: source.dec_id, //这里可以模拟当前dec_id
                                target: target.local_device_id().object_id,
                                // 需要处理数据的关联对象，主要用以chunk/file等+-
                                referer_object: [],
                                flags: 0,
                                req_path: path_handler//如果没有DecId，那么就当当前decid处理
                            },
                            // 目前只支持ChunkId/FileId/DirId
                            object_id: file_id
                            
                        }

                        let resp = await source.ndn_service().get_data(req)
                        console.info(`${file_id} 下载结果：${resp}`)
                        if (resp.err) {
                            console.info({ err: true, log: `ndn_service get_data failed` })
                        }
                        //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                        console.info(`下载file 成功： ${JSON.stringify(resp)}`)

                        //清理数据
                        await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                        
                        return { err: false, log: `file 下载成功`};
                    })
                    it("#NDN权限测试,objectmap_inner_path,get_data,File目标对象,来源对象objectmap_inner_path",async()=>{
                        //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1device1.fork_with_new_dec(DecId.DecIdA)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                        let res= (await trans_chunk_for_getdata(stack,filePath,"\\" + fileName,chunkSize,level))
                        let file_id = res[1].object_id
                        //[object_map_id,file_id_from_objectmap,dir_id,chunkIdList]
                        
                        //将file对象id挂在objet_map上
                        console.info("remove_with_path", await op_env_stub_target.remove_with_path(acl_path))
                        let result1 = await op_env_stub_target.insert_with_path(acl_path, file_id)
                        console.info(`# insert_with_path_result1:${JSON.stringify(result1)}}`)
                        assert.ok(!result1.err)

                        let update_result2 = await op_env_stub_source.update()
                        console.info("update_result2",update_result2)
                        assert.ok(!update_result2.err)

                        let list_result1 = await op_env_stub_source.list(acl_path)
                        console.info("list_result1",list_result1)

                        //await op_env_stub_source.commit()
                        //调用get_data接口
                        let req: cyfs.NDNGetDataOutputRequest = {
                            common: {                                   
                                level: cyfs.NDNAPILevel.NDN,// api级别
                                dec_id: source.dec_id, //这里可以模拟当前dec_id
                                target: target.local_device_id().object_id,
                                // 需要处理数据的关联对象，主要用以chunk/file等+-
                                referer_object: [new cyfs.NDNDataRefererObject(undefined,res[0].object_id,"/" + fileName)],
                                flags: 0,
                                req_path: path_handler//如果没有DecId，那么就当当前decid处理
                            },
                            // 目前只支持ChunkId/FileId/DirId
                            object_id: file_id
                            
                        }

                        let resp = await source.ndn_service().get_data(req)
                        console.info(`${file_id} 下载结果：${resp}`)
                        if (resp.err) {
                            console.info({ err: true, log: `ndn_service get_data failed` })
                        }
                        //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                        console.info(`下载file 成功： ${JSON.stringify(resp)}`)

                        //清理数据
                        await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                        
                        return { err: false, log: `file 下载成功`};
                    })
                    it("#NDN权限测试,objectmap_inner_path,get_data,objectmap_inner_path目标对象",async()=>{
                        //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1device1.fork_with_new_dec(DecId.DecIdA)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                        let res= (await trans_chunk_for_getdata(stack,filePath,"\\" + fileName,chunkSize,level))
                        let file_id = res[1].object_id
                        //[object_map_id,file_id_from_objectmap,dir_id,chunkIdList]
                        
                        //将file对象id挂在objet_map上
                        console.info("remove_with_path", await op_env_stub_target.remove_with_path(acl_path))
                        let result1 = await op_env_stub_target.insert_with_path(acl_path, file_id)
                        console.info(`# insert_with_path_result1:${JSON.stringify(result1)}}`)
                        assert.ok(!result1.err)

                        let update_result2 = await op_env_stub_source.update()
                        console.info("update_result2",update_result2)
                        assert.ok(!update_result2.err)

                        let list_result1 = await op_env_stub_source.list(acl_path)
                        console.info("list_result1",list_result1)

                        //await op_env_stub_source.commit()
                        //调用get_data接口
                        let req: cyfs.NDNGetDataOutputRequest = {
                            common: {                                   
                                level: cyfs.NDNAPILevel.NDN,// api级别
                                dec_id: source.dec_id, //这里可以模拟当前dec_id
                                target: target.local_device_id().object_id,
                                // 需要处理数据的关联对象，主要用以chunk/file等+-
                                referer_object: [],
                                flags: 0,
                                req_path: path_handler//如果没有DecId，那么就当当前decid处理
                            },
                            // 目前只支持ChunkId/FileId/DirId
                            inner_path: "/" + fileName,
                            object_id: res[0].object_id
                            
                        }

                        let resp = await source.ndn_service().get_data(req)
                        console.info(`${file_id} 下载结果：${resp}`)
                        if (resp.err) {
                            console.info({ err: true, log: `ndn_service get_data failed` })
                        }
                        //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                        console.info(`下载file 成功： ${JSON.stringify(resp)}`)

                        //清理数据
                        await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                        
                        return { err: false, log: `file 下载成功`};
                    
                    })
                })
                describe.skip("#NDN权限测试,objectmap_inner_path,trans_createtask",async()=>{
                    it("#NDN权限测试,objectmap_inner_path,trans_createtask,chunk目标对象",async()=>{
                                               //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1ood.fork_with_new_dec(DecId.DecIdB)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        let savePath = path.join(__dirname, "./chunk_trans/target/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let root_path = "/123/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 10 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                        let res= (await trans_file_for_task(stack,filePath,"\\" + fileName,chunkSize,level))
                        let chunkIdList = res[1]
                        
                        //将file对象id挂在objet_map上
                        let file_id = res[0]
                        console.info("res_file_id",file_id)
                         
                        //从target设备get 对象数据
                        console.log("chunkIdList_length",chunkIdList!.length)
                        let chunkRecvPromise: Array<any> = []
                        for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                            console.log("chunkIdList_i_ ", i)
                            chunkRecvPromise.push(new Promise(async (v) => {
                     
                                let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                                console.info(`开始传输chunk:${chunkId},${buff}`)

                                //将chunkid对象id挂在objet_map上
                                //4. target 设备 start_task 开始下载文件
                                
                                let create_task = (await source.trans().create_task({
                                    common: {
                                        level: cyfs.NDNAPILevel.NDN,
                                        flags: 0,
                                        dec_id: source.dec_id,
                                        target: target.local_device_id().object_id,
                                        //referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)]
                                        referer_object: []
                                    },
                                    //不支持DirId,支持ChunkId/FileId
                                    object_id: chunkId.calculate_id(),
                                    local_path: savePath +"\\" + fileName,
                                    device_list: [target.local_device_id()],
                                    auto_start: true
                                })).unwrap()
                                let sleepTime = 50;
                                console.log("create_task_id",JSON.stringify(create_task.task_id))
                            
                                //5. target 设备 get_task_state 检查下载状态
                                let check: Promise<{ err: boolean, log: string, fileId?: string}> = new Promise(async (v) => {
                                    setTimeout(() => {
                                        console.info(`下载文件超时`)
                                        v({ err: true, log: `下载文件超时：${chunkId.calculate_id()}` })
                                    }, timeout)
                                    while (true) {
                                        console.log(`${savePath}`);
                                        const resp = (await source.trans().get_task_state({
                                            common: {
                                                level: cyfs.NDNAPILevel.NDC,
                                                flags: 0,
                                                dec_id: source.dec_id,
                                                target: source.local_device_id().object_id,
                                                req_path: "",
                                                referer_object: []

                                            },
                                            task_id: create_task.task_id
                                        })).unwrap();
                                        console.log("get task status", JSON.stringify(resp.state));
                                        if (resp.state === cyfs.TransTaskState.Finished) {
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
                                
                                
                                    v({ err: false, log: `下载文件成功：${chunkId.calculate_id()}` })
                                })       
                                //let result = await check;
                                //return result
                            }))}
                            let download = []
                            for (let i in chunkRecvPromise) {
                                let result = await chunkRecvPromise[i]
                            if (result.err) {
                                return { err: result.err, log: result.log }
                            }
                            download.push(result)                        
                            }
                        
                        //清理数据
                        //await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)   
                    })
                    it("#NDN权限测试,objectmap_inner_path,trans_createtask,chunk目标对象,来源对象file",async()=>{
                                               //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1ood.fork_with_new_dec(DecId.DecIdB)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        let savePath = path.join(__dirname, "./chunk_trans/target/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let root_path = "/123/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 10 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                        let res= (await trans_file_for_task(stack,filePath,"\\" + fileName,chunkSize,level))
                        let chunkIdList = res[1]
                        
                        //将file对象id挂在objet_map上
                        let file_id = res[0]
                        console.info("res_file_id",file_id)
                         
                        //从target设备get 对象数据
                        console.log("chunkIdList_length",chunkIdList!.length)
                        let chunkRecvPromise: Array<any> = []
                        for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                            console.log("chunkIdList_i_ ", i)
                            chunkRecvPromise.push(new Promise(async (v) => {
                     
                                let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                                console.info(`开始传输chunk:${chunkId},${buff}`)

                                //将chunkid对象id挂在objet_map上
                                //4. target 设备 start_task 开始下载文件
                                
                                let create_task = (await source.trans().create_task({
                                    common: {
                                        level: cyfs.NDNAPILevel.NDN,
                                        flags: 0,
                                        dec_id: source.dec_id,
                                        target: target.local_device_id().object_id,
                                        //referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)]
                                        referer_object: []
                                    },
                                    //不支持DirId,支持ChunkId/FileId
                                    object_id: chunkId.calculate_id(),
                                    local_path: savePath +"\\" + fileName,
                                    device_list: [target.local_device_id()],
                                    auto_start: true
                                })).unwrap()
                                let sleepTime = 50;
                                console.log("create_task_id",JSON.stringify(create_task.task_id))
                            
                                //5. target 设备 get_task_state 检查下载状态
                                let check: Promise<{ err: boolean, log: string, fileId?: string}> = new Promise(async (v) => {
                                    setTimeout(() => {
                                        console.info(`下载文件超时`)
                                        v({ err: true, log: `下载文件超时：${chunkId.calculate_id()}` })
                                    }, timeout)
                                    while (true) {
                                        console.log(`${savePath}`);
                                        const resp = (await source.trans().get_task_state({
                                            common: {
                                                level: cyfs.NDNAPILevel.NDC,
                                                flags: 0,
                                                dec_id: source.dec_id,
                                                target: source.local_device_id().object_id,
                                                req_path: "",
                                                referer_object: []

                                            },
                                            task_id: create_task.task_id
                                        })).unwrap();
                                        console.log("get task status", JSON.stringify(resp.state));
                                        if (resp.state === cyfs.TransTaskState.Finished) {
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
                                
                                
                                    v({ err: false, log: `下载文件成功：${chunkId.calculate_id()}` })
                                })       
                                //let result = await check;
                                //return result
                            }))}
                            let download = []
                            for (let i in chunkRecvPromise) {
                                let result = await chunkRecvPromise[i]
                            if (result.err) {
                                return { err: result.err, log: result.log }
                            }
                            download.push(result)                        
                            }
                        
                        //清理数据
                        //await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)   
                    })
                    it("#NDN权限测试,objectmap_inner_path,trans_createtask,chunk目标对象,来源对象dir",async()=>{
                                               //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1ood.fork_with_new_dec(DecId.DecIdB)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        let savePath = path.join(__dirname, "./chunk_trans/target/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let root_path = "/123/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 10 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                        let res= (await trans_file_for_task(stack,filePath,"\\" + fileName,chunkSize,level))
                        let chunkIdList = res[1]
                        
                        //将file对象id挂在objet_map上
                        let file_id = res[0]
                        console.info("res_file_id",file_id)
                         
                        //从target设备get 对象数据
                        console.log("chunkIdList_length",chunkIdList!.length)
                        let chunkRecvPromise: Array<any> = []
                        for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                            console.log("chunkIdList_i_ ", i)
                            chunkRecvPromise.push(new Promise(async (v) => {
                     
                                let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                                console.info(`开始传输chunk:${chunkId},${buff}`)

                                //将chunkid对象id挂在objet_map上
                                //4. target 设备 start_task 开始下载文件
                                
                                let create_task = (await source.trans().create_task({
                                    common: {
                                        level: cyfs.NDNAPILevel.NDN,
                                        flags: 0,
                                        dec_id: source.dec_id,
                                        target: target.local_device_id().object_id,
                                        //referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)]
                                        referer_object: []
                                    },
                                    //不支持DirId,支持ChunkId/FileId
                                    object_id: chunkId.calculate_id(),
                                    local_path: savePath +"\\" + fileName,
                                    device_list: [target.local_device_id()],
                                    auto_start: true
                                })).unwrap()
                                let sleepTime = 50;
                                console.log("create_task_id",JSON.stringify(create_task.task_id))
                            
                                //5. target 设备 get_task_state 检查下载状态
                                let check: Promise<{ err: boolean, log: string, fileId?: string}> = new Promise(async (v) => {
                                    setTimeout(() => {
                                        console.info(`下载文件超时`)
                                        v({ err: true, log: `下载文件超时：${chunkId.calculate_id()}` })
                                    }, timeout)
                                    while (true) {
                                        console.log(`${savePath}`);
                                        const resp = (await source.trans().get_task_state({
                                            common: {
                                                level: cyfs.NDNAPILevel.NDC,
                                                flags: 0,
                                                dec_id: source.dec_id,
                                                target: source.local_device_id().object_id,
                                                req_path: "",
                                                referer_object: []

                                            },
                                            task_id: create_task.task_id
                                        })).unwrap();
                                        console.log("get task status", JSON.stringify(resp.state));
                                        if (resp.state === cyfs.TransTaskState.Finished) {
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
                                
                                
                                    v({ err: false, log: `下载文件成功：${chunkId.calculate_id()}` })
                                })       
                                //let result = await check;
                                //return result
                            }))}
                            let download = []
                            for (let i in chunkRecvPromise) {
                                let result = await chunkRecvPromise[i]
                            if (result.err) {
                                return { err: result.err, log: result.log }
                            }
                            download.push(result)                        
                            }
                        
                        //清理数据
                        //await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)   
                    })
                    it("#NDN权限测试,objectmap_inner_path,trans_createtask,chunk目标对象,来源对象objectmap+inner_path",async()=>{
                                               //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1ood.fork_with_new_dec(DecId.DecIdB)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        let savePath = path.join(__dirname, "./chunk_trans/target/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let root_path = "/123/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 10 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                        let res= (await trans_file_for_task(stack,filePath,"\\" + fileName,chunkSize,level))
                        let chunkIdList = res[1]
                        
                        //将file对象id挂在objet_map上
                        let file_id = res[0]
                        console.info("res_file_id",file_id)
                         
                        //从target设备get 对象数据
                        console.log("chunkIdList_length",chunkIdList!.length)
                        let chunkRecvPromise: Array<any> = []
                        for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                            console.log("chunkIdList_i_ ", i)
                            chunkRecvPromise.push(new Promise(async (v) => {
                     
                                let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                                console.info(`开始传输chunk:${chunkId},${buff}`)

                                //将chunkid对象id挂在objet_map上
                                //4. target 设备 start_task 开始下载文件
                                
                                let create_task = (await source.trans().create_task({
                                    common: {
                                        level: cyfs.NDNAPILevel.NDN,
                                        flags: 0,
                                        dec_id: source.dec_id,
                                        target: target.local_device_id().object_id,
                                        //referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)]
                                        referer_object: []
                                    },
                                    //不支持DirId,支持ChunkId/FileId
                                    object_id: chunkId.calculate_id(),
                                    local_path: savePath +"\\" + fileName,
                                    device_list: [target.local_device_id()],
                                    auto_start: true
                                })).unwrap()
                                let sleepTime = 50;
                                console.log("create_task_id",JSON.stringify(create_task.task_id))
                            
                                //5. target 设备 get_task_state 检查下载状态
                                let check: Promise<{ err: boolean, log: string, fileId?: string}> = new Promise(async (v) => {
                                    setTimeout(() => {
                                        console.info(`下载文件超时`)
                                        v({ err: true, log: `下载文件超时：${chunkId.calculate_id()}` })
                                    }, timeout)
                                    while (true) {
                                        console.log(`${savePath}`);
                                        const resp = (await source.trans().get_task_state({
                                            common: {
                                                level: cyfs.NDNAPILevel.NDC,
                                                flags: 0,
                                                dec_id: source.dec_id,
                                                target: source.local_device_id().object_id,
                                                req_path: "",
                                                referer_object: []

                                            },
                                            task_id: create_task.task_id
                                        })).unwrap();
                                        console.log("get task status", JSON.stringify(resp.state));
                                        if (resp.state === cyfs.TransTaskState.Finished) {
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
                                
                                
                                    v({ err: false, log: `下载文件成功：${chunkId.calculate_id()}` })
                                })       
                                //let result = await check;
                                //return result
                            }))}
                            let download = []
                            for (let i in chunkRecvPromise) {
                                let result = await chunkRecvPromise[i]
                            if (result.err) {
                                return { err: result.err, log: result.log }
                            }
                            download.push(result)                        
                            }
                        
                        //清理数据
                        //await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)   
                    })
                    it("#NDN权限测试,objectmap_inner_path,trans_createtask,File目标对象",async()=>{
                                               //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1ood.fork_with_new_dec(DecId.DecIdB)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        let savePath = path.join(__dirname, "./chunk_trans/target/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let root_path = "/123/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 10 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                        let res= (await trans_file_for_task(stack,filePath,"\\" + fileName,chunkSize,level))
                        let chunkIdList = res[1]
                        
                        //将file对象id挂在objet_map上
                        let file_id = res[0]
                        console.info("res_file_id",file_id)
                         
                        //从target设备get 对象数据
                        console.log("chunkIdList_length",chunkIdList!.length)
                        let chunkRecvPromise: Array<any> = []
                        for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                            console.log("chunkIdList_i_ ", i)
                            chunkRecvPromise.push(new Promise(async (v) => {
                     
                                let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                                console.info(`开始传输chunk:${chunkId},${buff}`)

                                //将chunkid对象id挂在objet_map上
                                //4. target 设备 start_task 开始下载文件
                                
                                let create_task = (await source.trans().create_task({
                                    common: {
                                        level: cyfs.NDNAPILevel.NDN,
                                        flags: 0,
                                        dec_id: source.dec_id,
                                        target: target.local_device_id().object_id,
                                        //referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)]
                                        referer_object: []
                                    },
                                    //不支持DirId,支持ChunkId/FileId
                                    object_id: chunkId.calculate_id(),
                                    local_path: savePath +"\\" + fileName,
                                    device_list: [target.local_device_id()],
                                    auto_start: true
                                })).unwrap()
                                let sleepTime = 50;
                                console.log("create_task_id",JSON.stringify(create_task.task_id))
                            
                                //5. target 设备 get_task_state 检查下载状态
                                let check: Promise<{ err: boolean, log: string, fileId?: string}> = new Promise(async (v) => {
                                    setTimeout(() => {
                                        console.info(`下载文件超时`)
                                        v({ err: true, log: `下载文件超时：${chunkId.calculate_id()}` })
                                    }, timeout)
                                    while (true) {
                                        console.log(`${savePath}`);
                                        const resp = (await source.trans().get_task_state({
                                            common: {
                                                level: cyfs.NDNAPILevel.NDC,
                                                flags: 0,
                                                dec_id: source.dec_id,
                                                target: source.local_device_id().object_id,
                                                req_path: "",
                                                referer_object: []

                                            },
                                            task_id: create_task.task_id
                                        })).unwrap();
                                        console.log("get task status", JSON.stringify(resp.state));
                                        if (resp.state === cyfs.TransTaskState.Finished) {
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
                                
                                
                                    v({ err: false, log: `下载文件成功：${chunkId.calculate_id()}` })
                                })       
                                //let result = await check;
                                //return result
                            }))}
                            let download = []
                            for (let i in chunkRecvPromise) {
                                let result = await chunkRecvPromise[i]
                            if (result.err) {
                                return { err: result.err, log: result.log }
                            }
                            download.push(result)                        
                            }
                        
                        //清理数据
                        //await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)   
                    })
                    it("#NDN权限测试,objectmap_inner_path,trans_createtask,File目标对象,来源对象objectmap_inner_path",async()=>{
                                               //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1ood.fork_with_new_dec(DecId.DecIdB)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        let savePath = path.join(__dirname, "./chunk_trans/target/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let root_path = "/123/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 10 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                        let res= (await trans_file_for_task(stack,filePath,"\\" + fileName,chunkSize,level))
                        let chunkIdList = res[1]
                        
                        //将file对象id挂在objet_map上
                        let file_id = res[0]
                        console.info("res_file_id",file_id)
                         
                        //从target设备get 对象数据
                        console.log("chunkIdList_length",chunkIdList!.length)
                        let chunkRecvPromise: Array<any> = []
                        for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                            console.log("chunkIdList_i_ ", i)
                            chunkRecvPromise.push(new Promise(async (v) => {
                     
                                let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                                console.info(`开始传输chunk:${chunkId},${buff}`)

                                //将chunkid对象id挂在objet_map上
                                //4. target 设备 start_task 开始下载文件
                                
                                let create_task = (await source.trans().create_task({
                                    common: {
                                        level: cyfs.NDNAPILevel.NDN,
                                        flags: 0,
                                        dec_id: source.dec_id,
                                        target: target.local_device_id().object_id,
                                        //referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)]
                                        referer_object: []
                                    },
                                    //不支持DirId,支持ChunkId/FileId
                                    object_id: chunkId.calculate_id(),
                                    local_path: savePath +"\\" + fileName,
                                    device_list: [target.local_device_id()],
                                    auto_start: true
                                })).unwrap()
                                let sleepTime = 50;
                                console.log("create_task_id",JSON.stringify(create_task.task_id))
                            
                                //5. target 设备 get_task_state 检查下载状态
                                let check: Promise<{ err: boolean, log: string, fileId?: string}> = new Promise(async (v) => {
                                    setTimeout(() => {
                                        console.info(`下载文件超时`)
                                        v({ err: true, log: `下载文件超时：${chunkId.calculate_id()}` })
                                    }, timeout)
                                    while (true) {
                                        console.log(`${savePath}`);
                                        const resp = (await source.trans().get_task_state({
                                            common: {
                                                level: cyfs.NDNAPILevel.NDC,
                                                flags: 0,
                                                dec_id: source.dec_id,
                                                target: source.local_device_id().object_id,
                                                req_path: "",
                                                referer_object: []

                                            },
                                            task_id: create_task.task_id
                                        })).unwrap();
                                        console.log("get task status", JSON.stringify(resp.state));
                                        if (resp.state === cyfs.TransTaskState.Finished) {
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
                                
                                
                                    v({ err: false, log: `下载文件成功：${chunkId.calculate_id()}` })
                                })       
                                //let result = await check;
                                //return result
                            }))}
                            let download = []
                            for (let i in chunkRecvPromise) {
                                let result = await chunkRecvPromise[i]
                            if (result.err) {
                                return { err: result.err, log: result.log }
                            }
                            download.push(result)                        
                            }
                        
                        //清理数据
                        //await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)   
                    })
                })

            })
            describe("#NDN权限测试,objectmap_inner_path,同zone不同dec",async()=>{
                describe("#NDN权限测试,objectmap_inner_path,getdata",async()=>{
                    //this.beforeEach(function(){});
                    //this.afterEach(function(){});
                    it("#NDN权限测试,objectmap_inner_path,getdata,chunk目标对象",async()=>{
                        //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1device1.fork_with_new_dec(DecId.DecIdB)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let root_path = "/123/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                         let res= (await trans_chunk_for_getdata(stack,filePath,"\\" + fileName,chunkSize,level))
                         let chunkIdList = res[3]
                         

                        //从target设备get 对象数据
                        console.log("chunkIdList",chunkIdList)
                        let chunkRecvPromise: Array<any> = []
                        for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                            console.log("chunkIdList_i_ ", i)
                            chunkRecvPromise.push(new Promise(async (v) => {

                            setTimeout(() => {v({ err: true, log: `ndn_service get_data timeout` })}, timeout)                       
                            let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                            console.info(`开始传输chunk:${chunkId},${buff}`)

                            //将chunkid对象id挂在objet_map上
                            console.info("remove_with_path", await op_env_stub_target.remove_with_path(acl_path))
                            let result1 = await op_env_stub_target.insert_with_path(acl_path, chunkId.calculate_id())
                            console.info(`# insert_with_path_result1:${JSON.stringify(result1)}}`)
                            assert.ok(!result1.err)

                            let update_result2 = await op_env_stub_source.update()
                            console.info("update_result2",update_result2)
                            assert.ok(!update_result2.err)

                            let list_result1 = await op_env_stub_source.list(acl_path)
                            console.info("list_result1",list_result1)



                            //await op_env_stub_source.commit()
                            //调用get_data接口
                            let req: cyfs.NDNGetDataOutputRequest = {
                                common: {                                   
                                    level: cyfs.NDNAPILevel.NDN,// api级别
                                    dec_id: source.dec_id, //这里可以模拟当前dec_id
                                    target: target.local_device_id().object_id,
                                    // 需要处理数据的关联对象，主要用以chunk/file等+-
                                    referer_object: [],
                                    flags: 0,
                                    req_path: path_handler//如果没有DecId，那么就当当前decid处理
                                },
                                // 目前只支持ChunkId/FileId/DirId
                                object_id: chunkId.calculate_id()
                                
                            }

                            let resp = await source.ndn_service().get_data(req)
                            console.info(`${chunkId} 下载结果：${resp}`)
                            if (resp.err) {
                                v({ err: true, log: `ndn_service get_data failed` })
                            }
                            //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                            console.info(`下载chunk 成功： ${JSON.stringify(resp)}`)
                            v({ err: false, chunkId: chunkId.calculate_id().to_base_58() })
                        }))
                        }
                        let download = []
                        for (let i in chunkRecvPromise) {
                        let result = await chunkRecvPromise[i]
                        if (result.err) {
                            return { err: result.err, log: result.log }
                        }
                        download.push(result)                        
                        }
                        //清理数据
                        await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                        
                        return { err: false, log: `chunk 下载成功`, download };
                    })
                    it("#NDN权限测试,objectmap_inner_path,get_data,chunk目标对象,来源对象file",async()=>{
                          //stack
                          let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                          let target = zone1device1.fork_with_new_dec(DecId.DecIdB)
  
                          //test conf
                          let fileName = RandomGenerator.string(10);
                          let filePath = path.join(__dirname, "./chunk_trans/source/")
                          console.log("filePath",filePath)
                          let chunkSize = 4 * 1024 * 1024
                          let chunkNumber = 10
                          let timeout: number = 600 * 1000                
                          let acl_path = "/test/api/test/"
                          let decid = target.dec_id
  
                          //create test file
                          await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);
  
                          //acl
                          await source.root_state_meta_stub(undefined,undefined).clear_access()
                          await target.root_state_meta_stub(undefined,undefined).clear_access()
                          await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                          await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
  
                          //rmeta
                          let stub_source = source.root_state_stub(undefined,undefined)
                          let stub_target = target.root_state_stub(undefined,undefined)
  
                          let env_acc:cyfs.RootStateOpEnvAccess = {
                          path:acl_path,
                          access:cyfs.AccessPermissions.Full 
                          }
      
                          //vaildate
                          let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()
  
                          let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                          let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                          
                          //初始化数据
                          let stack = [source,source,source,source,source,source,source,source,source,source]
                          let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                           let res= (await trans_chunk_for_getdata(stack,filePath,"\\" + fileName,chunkSize,level))
                           let chunkIdList = res[3]
                           //[object_map_id,file_id_from_objectmap,dir_id,chunkIdList]
                           
  
                          //从target设备get 对象数据
                          console.log("chunkIdList",chunkIdList)
                          let chunkRecvPromise: Array<any> = []
                          for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                              console.log("chunkIdList_i_ ", i)
                              chunkRecvPromise.push(new Promise(async (v) => {
  
                              setTimeout(() => {v({ err: true, log: `ndn_service get_data timeout` })}, timeout)                       
                              let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                              console.info(`开始传输chunk:${chunkId},${buff}`)
  
                              //将chunkid对象id挂在objet_map上
                              console.info("remove_with_path", await op_env_stub_target.remove_with_path(acl_path))
                              let result1 = await op_env_stub_target.insert_with_path(acl_path, res[1].object_id)
                              console.info(`# insert_with_path_result1:${JSON.stringify(result1)}}`)
                              assert.ok(!result1.err)
  
                              let update_result2 = await op_env_stub_source.update()
                              console.info("update_result2",update_result2)
                              assert.ok(!update_result2.err)
  
                              let list_result1 = await op_env_stub_source.list(acl_path)
                              console.info("list_result1",list_result1)
  
  
  
                              //await op_env_stub_source.commit()
                              //调用get_data接口
                              let req: cyfs.NDNGetDataOutputRequest = {
                                  common: {                                   
                                      level: cyfs.NDNAPILevel.NDN,// api级别
                                      dec_id: source.dec_id, //这里可以模拟当前dec_id
                                      target: target.local_device_id().object_id,
                                      // 需要处理数据的关联对象，主要用以chunk/file等+-
                                      referer_object: [new cyfs.NDNDataRefererObject(undefined,res[1].object_id)],
                                      flags: 0,
                                      req_path: path_handler//如果没有DecId，那么就当当前decid处理
                                  },
                                  // 目前只支持ChunkId/FileId/DirId
                                  object_id: chunkId.calculate_id()
                                  
                              }
  
                              let resp = await source.ndn_service().get_data(req)
                              console.info(`${chunkId} 下载结果：${resp}`)
                              if (resp.err) {
                                  v({ err: true, log: `ndn_service get_data failed` })
                              }
                              //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                              console.info(`下载chunk 成功： ${JSON.stringify(resp)}`)
                              v({ err: false, chunkId: chunkId.calculate_id().to_base_58() })
                          }))
                          }
                          let download = []
                          for (let i in chunkRecvPromise) {
                          let result = await chunkRecvPromise[i]
                          if (result.err) {
                              return { err: result.err, log: result.log }
                          }
                          download.push(result)                        
                          }
                          //清理数据
                          await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                          
                          return { err: false, log: `chunk 下载成功`, download };
                    })
                    //需要增加chunkid与dir的关联
                    it.skip("#NDN权限测试,objectmap_inner_path,get_data,chunk目标对象,来源对象dir",async()=>{
                         //stack
                         let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                         let target = zone1device1.fork_with_new_dec(DecId.DecIdB)
                         //test conf
                         let fileName = RandomGenerator.string(10);
                         let filePath = path.join(__dirname, "./chunk_trans/source/")
                         console.log("filePath",filePath)
                         let chunkSize = 4 * 1024 * 1024
                         let chunkNumber = 10
                         let timeout: number = 600 * 1000                
                         let acl_path = "/test/api/test/"
                         let decid = target.dec_id
 
                         //create test file
                         await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);
 
                         //acl
                         await source.root_state_meta_stub(undefined,undefined).clear_access()
                         await target.root_state_meta_stub(undefined,undefined).clear_access()
                         await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                         await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
 
                         //rmeta
                         let stub_source = source.root_state_stub(undefined,undefined)
                         let stub_target = target.root_state_stub(undefined,undefined)
 
                         let env_acc:cyfs.RootStateOpEnvAccess = {
                         path:acl_path,
                         access:cyfs.AccessPermissions.Full 
                         }
     
                         //vaildate
                         let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()
 
                         let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                         let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                         
                         //初始化数据
                         let stack = [source,source,source,source,source,source,source,source,source,source]
                         let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                          let res= (await trans_chunk_for_getdata(stack,filePath,"\\" + fileName,chunkSize,level))
                          let chunkIdList = res[3]
                          //[object_map_id,file_id_from_objectmap,dir_id,chunkIdList]
                          
 
                         //从target设备get 对象数据
                         console.log("chunkIdList",chunkIdList)
                         let chunkRecvPromise: Array<any> = []
                         for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                             console.log("chunkIdList_i_ ", i)
                             chunkRecvPromise.push(new Promise(async (v) => {
 
                             setTimeout(() => {v({ err: true, log: `ndn_service get_data timeout` })}, timeout)                       
                             let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                             console.info(`开始传输chunk:${chunkId},${buff}`)
 
                             //将chunkid对象id挂在objet_map上
                             console.info("remove_with_path", await op_env_stub_target.remove_with_path(acl_path))
                             let result1 = await op_env_stub_target.insert_with_path(acl_path, res[1].object_id)
                             console.info(`# insert_with_path_result1:${JSON.stringify(result1)}}`)
                             assert.ok(!result1.err)
 
                             let update_result2 = await op_env_stub_source.update()
                             console.info("update_result2",update_result2)
                             assert.ok(!update_result2.err)
 
                             let list_result1 = await op_env_stub_source.list(acl_path)
                             console.info("list_result1",list_result1)
 
 
 
                             //await op_env_stub_source.commit()
                             //调用get_data接口
                             let req: cyfs.NDNGetDataOutputRequest = {
                                 common: {                                   
                                     level: cyfs.NDNAPILevel.NDN,// api级别
                                     dec_id: source.dec_id, //这里可以模拟当前dec_id
                                     target: target.local_device_id().object_id,
                                     // 需要处理数据的关联对象，主要用以chunk/file等+-
                                     referer_object: [new cyfs.NDNDataRefererObject(undefined,res[1].object_id)],
                                     flags: 0,
                                     req_path: path_handler//如果没有DecId，那么就当当前decid处理
                                 },
                                 // 目前只支持ChunkId/FileId/DirId
                                 object_id: chunkId.calculate_id()
                                 
                             }
 
                             let resp = await source.ndn_service().get_data(req)
                             console.info(`${chunkId} 下载结果：${resp}`)
                             if (resp.err) {
                                 v({ err: true, log: `ndn_service get_data failed` })
                             }
                             //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                             console.info(`下载chunk 成功： ${JSON.stringify(resp)}`)
                             v({ err: false, chunkId: chunkId.calculate_id().to_base_58() })
                         }))
                         }
                         let download = []
                         for (let i in chunkRecvPromise) {
                         let result = await chunkRecvPromise[i]
                         if (result.err) {
                             return { err: result.err, log: result.log }
                         }
                         download.push(result)                        
                         }
                         //清理数据
                         await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                         
                         return { err: false, log: `chunk 下载成功`, download };

                    })
                    it("#NDN权限测试,objectmap_inner_path,get_data,chunk目标对象,来源对象objectmap+inner_path",async()=>{
                        //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1device1.fork_with_new_dec(DecId.DecIdB)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                         let res= (await trans_chunk_for_getdata(stack,filePath,"\\" + fileName,chunkSize,level))
                         let chunkIdList = res[3]
                         //[object_map_id,file_id_from_objectmap,dir_id,chunkIdList]
                         

                        //从target设备get 对象数据
                        console.log("chunkIdList",chunkIdList)
                        let chunkRecvPromise: Array<any> = []
                        for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                            console.log("chunkIdList_i_ ", i)
                            chunkRecvPromise.push(new Promise(async (v) => {

                            setTimeout(() => {v({ err: true, log: `ndn_service get_data timeout` })}, timeout)                       
                            let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                            console.info(`开始传输chunk:${chunkId},${buff}`)

                            //将chunkid对象id挂在objet_map上
                            console.info("remove_with_path", await op_env_stub_target.remove_with_path(acl_path))
                            let result1 = await op_env_stub_target.insert_with_path(acl_path, res[1].object_id)
                            console.info(`# insert_with_path_result1:${JSON.stringify(result1)}}`)
                            assert.ok(!result1.err)

                            let update_result2 = await op_env_stub_source.update()
                            console.info("update_result2",update_result2)
                            assert.ok(!update_result2.err)

                            let list_result1 = await op_env_stub_source.list(acl_path)
                            console.info("list_result1",list_result1)



                            //await op_env_stub_source.commit()
                            //调用get_data接口
                            let req: cyfs.NDNGetDataOutputRequest = {
                                common: {                                   
                                    level: cyfs.NDNAPILevel.NDN,// api级别
                                    dec_id: source.dec_id, //这里可以模拟当前dec_id
                                    target: target.local_device_id().object_id,
                                    // 需要处理数据的关联对象，主要用以chunk/file等+-
                                    referer_object: [new cyfs.NDNDataRefererObject(undefined,res[0].object_id,"/" + fileName)],
                                    flags: 0,
                                    req_path: path_handler//如果没有DecId，那么就当当前decid处理
                                },
                                // 目前只支持ChunkId/FileId/DirId
                                object_id: chunkId.calculate_id()
                                
                            }

                            let resp = await source.ndn_service().get_data(req)
                            console.info(`${chunkId} 下载结果：${resp}`)
                            if (resp.err) {
                                v({ err: true, log: `ndn_service get_data failed` })
                            }
                            //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                            console.info(`下载chunk 成功： ${JSON.stringify(resp)}`)
                            v({ err: false, chunkId: chunkId.calculate_id().to_base_58() })
                        }))
                        }
                        let download = []
                        for (let i in chunkRecvPromise) {
                        let result = await chunkRecvPromise[i]
                        if (result.err) {
                            return { err: result.err, log: result.log }
                        }
                        download.push(result)                        
                        }
                        //清理数据
                        await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                        
                        return { err: false, log: `chunk 下载成功`, download };
                    })
                    it("#NDN权限测试,objectmap_inner_path,get_data,File目标对象",async()=>{
                        //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1device1.fork_with_new_dec(DecId.DecIdB)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                        let res= (await trans_chunk_for_getdata(stack,filePath,"\\" + fileName,chunkSize,level))
                        let file_id = res[1].object_id
                        //[object_map_id,file_id_from_objectmap,dir_id,chunkIdList]
                      
                        //将file对象id挂在objet_map上
                        console.info("remove_with_path", await op_env_stub_target.remove_with_path(acl_path))
                        let result1 = await op_env_stub_target.insert_with_path(acl_path, file_id)
                        console.info(`# insert_with_path_result1:${JSON.stringify(result1)}}`)
                        assert.ok(!result1.err)

                        let update_result2 = await op_env_stub_source.update()
                        console.info("update_result2",update_result2)
                        assert.ok(!update_result2.err)

                        let list_result1 = await op_env_stub_source.list(acl_path)
                        console.info("list_result1",list_result1)

                        //await op_env_stub_source.commit()
                        //调用get_data接口
                        let req: cyfs.NDNGetDataOutputRequest = {
                            common: {                                   
                                level: cyfs.NDNAPILevel.NDN,// api级别
                                dec_id: source.dec_id, //这里可以模拟当前dec_id
                                target: target.local_device_id().object_id,
                                // 需要处理数据的关联对象，主要用以chunk/file等+-
                                referer_object: [],
                                flags: 0,
                                req_path: path_handler//如果没有DecId，那么就当当前decid处理
                            },
                            // 目前只支持ChunkId/FileId/DirId
                            object_id: file_id
                            
                        }

                        let resp = await source.ndn_service().get_data(req)
                        console.info(`${file_id} 下载结果：${resp}`)
                        if (resp.err) {
                            console.info({ err: true, log: `ndn_service get_data failed` })
                        }
                        //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                        console.info(`下载file 成功： ${JSON.stringify(resp)}`)

                        //清理数据
                        await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                        
                        return { err: false, log: `file 下载成功`};
                    })
                    it("#NDN权限测试,objectmap_inner_path,get_data,File目标对象,来源对象objectmap_inner_path",async()=>{
                        //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1device1.fork_with_new_dec(DecId.DecIdB)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                        let res= (await trans_chunk_for_getdata(stack,filePath,"\\" + fileName,chunkSize,level))
                        let file_id = res[1].object_id
                        //[object_map_id,file_id_from_objectmap,dir_id,chunkIdList]
                        
                        //将file对象id挂在objet_map上
                        console.info("remove_with_path", await op_env_stub_target.remove_with_path(acl_path))
                        let result1 = await op_env_stub_target.insert_with_path(acl_path, file_id)
                        console.info(`# insert_with_path_result1:${JSON.stringify(result1)}}`)
                        assert.ok(!result1.err)

                        let update_result2 = await op_env_stub_source.update()
                        console.info("update_result2",update_result2)
                        assert.ok(!update_result2.err)

                        let list_result1 = await op_env_stub_source.list(acl_path)
                        console.info("list_result1",list_result1)

                        //await op_env_stub_source.commit()
                        //调用get_data接口
                        let req: cyfs.NDNGetDataOutputRequest = {
                            common: {                                   
                                level: cyfs.NDNAPILevel.NDN,// api级别
                                dec_id: source.dec_id, //这里可以模拟当前dec_id
                                target: target.local_device_id().object_id,
                                // 需要处理数据的关联对象，主要用以chunk/file等+-
                                referer_object: [new cyfs.NDNDataRefererObject(undefined,res[0].object_id,"/" + fileName)],
                                flags: 0,
                                req_path: path_handler//如果没有DecId，那么就当当前decid处理
                            },
                            // 目前只支持ChunkId/FileId/DirId
                            object_id: file_id
                            
                        }

                        let resp = await source.ndn_service().get_data(req)
                        console.info(`${file_id} 下载结果：${resp}`)
                        if (resp.err) {
                            console.info({ err: true, log: `ndn_service get_data failed` })
                        }
                        //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                        console.info(`下载file 成功： ${JSON.stringify(resp)}`)

                        //清理数据
                        await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                        
                        return { err: false, log: `file 下载成功`};
                    })
                    it("#NDN权限测试,objectmap_inner_path,get_data,objectmap_inner_path目标对象",async()=>{
                        //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1device1.fork_with_new_dec(DecId.DecIdB)
                        
                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                        let res= (await trans_chunk_for_getdata(stack,filePath,"\\" + fileName,chunkSize,level))
                        let file_id = res[1].object_id
                        //[object_map_id,file_id_from_objectmap,dir_id,chunkIdList]
                        
                        //将file对象id挂在objet_map上
                        console.info("remove_with_path", await op_env_stub_target.remove_with_path(acl_path))
                        let result1 = await op_env_stub_target.insert_with_path(acl_path, file_id)
                        console.info(`# insert_with_path_result1:${JSON.stringify(result1)}}`)
                        assert.ok(!result1.err)

                        let update_result2 = await op_env_stub_source.update()
                        console.info("update_result2",update_result2)
                        assert.ok(!update_result2.err)

                        let list_result1 = await op_env_stub_source.list(acl_path)
                        console.info("list_result1",list_result1)

                        //await op_env_stub_source.commit()
                        //调用get_data接口
                        let req: cyfs.NDNGetDataOutputRequest = {
                            common: {                                   
                                level: cyfs.NDNAPILevel.NDN,// api级别
                                dec_id: source.dec_id, //这里可以模拟当前dec_id
                                target: target.local_device_id().object_id,
                                // 需要处理数据的关联对象，主要用以chunk/file等+-
                                referer_object: [],
                                flags: 0,
                                req_path: path_handler//如果没有DecId，那么就当当前decid处理
                            },
                            // 目前只支持ChunkId/FileId/DirId
                            inner_path: "/" + fileName,
                            object_id: res[0].object_id
                            
                        }

                        let resp = await source.ndn_service().get_data(req)
                        console.info(`${file_id} 下载结果：${resp}`)
                        if (resp.err) {
                            console.info({ err: true, log: `ndn_service get_data failed` })
                        }
                        //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                        console.info(`下载file 成功： ${JSON.stringify(resp)}`)

                        //清理数据
                        await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                        
                        return { err: false, log: `file 下载成功`};
                    
                    })
                })
                describe.skip("#NDN权限测试,objectmap_inner_path,trans_createtask",async()=>{
                    it("#NDN权限测试,objectmap_inner_path,trans_createtask,chunk目标对象",async()=>{
                    })
                    it("#NDN权限测试,objectmap_inner_path,trans_createtask,chunk目标对象,来源对象file",async()=>{
                    })
                    it("#NDN权限测试,objectmap_inner_path,trans_createtask,chunk目标对象,来源对象dir",async()=>{
                    })
                    it("#NDN权限测试,objectmap_inner_path,trans_createtask,chunk目标对象,来源对象objectmap+inner_path",async()=>{
                    })
                    it("#NDN权限测试,objectmap_inner_path,trans_createtask,File目标对象",async()=>{
                    })
                    it("#NDN权限测试,objectmap_inner_path,trans_createtask,File目标对象,来源对象objectmap_inner_path",async()=>{
                    })
                })
            })
        })
        describe("#NDN权限测试,objectmap_inner_path,不同zone",async()=>{
            describe("#NDN权限测试,objectmap_inner_path,不同zone同dec",async()=>{
                describe("#NDN权限测试,objectmap_inner_path,getdata",async()=>{
                    //this.beforeEach(function(){});
                    //this.afterEach(function(){});
                    it("#NDN权限测试,objectmap_inner_path,getdata,chunk目标对象",async()=>{
                        //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone2ood.fork_with_new_dec(DecId.DecIdA)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let root_path = "/123/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                         let res= (await trans_chunk_for_getdata(stack,filePath,"\\" + fileName,chunkSize,level))
                         let chunkIdList = res[3]
                         

                        //从target设备get 对象数据
                        console.log("chunkIdList",chunkIdList)
                        let chunkRecvPromise: Array<any> = []
                        for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                            console.log("chunkIdList_i_ ", i)
                            chunkRecvPromise.push(new Promise(async (v) => {

                            setTimeout(() => {v({ err: true, log: `ndn_service get_data timeout` })}, timeout)                       
                            let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                            console.info(`开始传输chunk:${chunkId},${buff}`)

                            //将chunkid对象id挂在objet_map上
                            console.info("remove_with_path", await op_env_stub_target.remove_with_path(acl_path))
                            let result1 = await op_env_stub_target.insert_with_path(acl_path, chunkId.calculate_id())
                            console.info(`# insert_with_path_result1:${JSON.stringify(result1)}}`)
                            assert.ok(!result1.err)

                            let update_result2 = await op_env_stub_source.update()
                            console.info("update_result2",update_result2)
                            assert.ok(!update_result2.err)

                            let list_result1 = await op_env_stub_source.list(acl_path)
                            console.info("list_result1",list_result1)



                            //await op_env_stub_source.commit()
                            //调用get_data接口
                            let req: cyfs.NDNGetDataOutputRequest = {
                                common: {                                   
                                    level: cyfs.NDNAPILevel.NDN,// api级别
                                    dec_id: source.dec_id, //这里可以模拟当前dec_id
                                    target: target.local_device_id().object_id,
                                    // 需要处理数据的关联对象，主要用以chunk/file等+-
                                    referer_object: [],
                                    flags: 0,
                                    req_path: path_handler//如果没有DecId，那么就当当前decid处理
                                },
                                // 目前只支持ChunkId/FileId/DirId
                                object_id: chunkId.calculate_id()
                                
                            }

                            let resp = await source.ndn_service().get_data(req)
                            console.info(`${chunkId} 下载结果：${resp}`)
                            if (resp.err) {
                                v({ err: true, log: `ndn_service get_data failed` })
                            }
                            //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                            console.info(`下载chunk 成功： ${JSON.stringify(resp)}`)
                            v({ err: false, chunkId: chunkId.calculate_id().to_base_58() })
                        }))
                        }
                        let download = []
                        for (let i in chunkRecvPromise) {
                        let result = await chunkRecvPromise[i]
                        if (result.err) {
                            return { err: result.err, log: result.log }
                        }
                        download.push(result)                        
                        }
                        //清理数据
                        await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                        
                        return { err: false, log: `chunk 下载成功`, download };
                    })
                    it("#NDN权限测试,objectmap_inner_path,get_data,chunk目标对象,来源对象file",async()=>{
                          //stack
                          let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                          let target = zone2ood.fork_with_new_dec(DecId.DecIdA)
  
                          //test conf
                          let fileName = RandomGenerator.string(10);
                          let filePath = path.join(__dirname, "./chunk_trans/source/")
                          console.log("filePath",filePath)
                          let chunkSize = 4 * 1024 * 1024
                          let chunkNumber = 10
                          let timeout: number = 600 * 1000                
                          let acl_path = "/test/api/test/"
                          let decid = target.dec_id
  
                          //create test file
                          await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);
  
                          //acl
                          await source.root_state_meta_stub(undefined,undefined).clear_access()
                          await target.root_state_meta_stub(undefined,undefined).clear_access()
                          await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                          await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
  
                          //rmeta
                          let stub_source = source.root_state_stub(undefined,undefined)
                          let stub_target = target.root_state_stub(undefined,undefined)
  
                          let env_acc:cyfs.RootStateOpEnvAccess = {
                          path:acl_path,
                          access:cyfs.AccessPermissions.Full 
                          }
      
                          //vaildate
                          let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()
  
                          let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                          let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                          
                          //初始化数据
                          let stack = [source,source,source,source,source,source,source,source,source,source]
                          let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                           let res= (await trans_chunk_for_getdata(stack,filePath,"\\" + fileName,chunkSize,level))
                           let chunkIdList = res[3]
                           //[object_map_id,file_id_from_objectmap,dir_id,chunkIdList]
                           
  
                          //从target设备get 对象数据
                          console.log("chunkIdList",chunkIdList)
                          let chunkRecvPromise: Array<any> = []
                          for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                              console.log("chunkIdList_i_ ", i)
                              chunkRecvPromise.push(new Promise(async (v) => {
  
                              setTimeout(() => {v({ err: true, log: `ndn_service get_data timeout` })}, timeout)                       
                              let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                              console.info(`开始传输chunk:${chunkId},${buff}`)
  
                              //将chunkid对象id挂在objet_map上
                              console.info("remove_with_path", await op_env_stub_target.remove_with_path(acl_path))
                              let result1 = await op_env_stub_target.insert_with_path(acl_path, res[1].object_id)
                              console.info(`# insert_with_path_result1:${JSON.stringify(result1)}}`)
                              assert.ok(!result1.err)
  
                              let update_result2 = await op_env_stub_source.update()
                              console.info("update_result2",update_result2)
                              assert.ok(!update_result2.err)
  
                              let list_result1 = await op_env_stub_source.list(acl_path)
                              console.info("list_result1",list_result1)
  
  
  
                              //await op_env_stub_source.commit()
                              //调用get_data接口
                              let req: cyfs.NDNGetDataOutputRequest = {
                                  common: {                                   
                                      level: cyfs.NDNAPILevel.NDN,// api级别
                                      dec_id: source.dec_id, //这里可以模拟当前dec_id
                                      target: target.local_device_id().object_id,
                                      // 需要处理数据的关联对象，主要用以chunk/file等+-
                                      referer_object: [new cyfs.NDNDataRefererObject(undefined,res[1].object_id)],
                                      flags: 0,
                                      req_path: path_handler//如果没有DecId，那么就当当前decid处理
                                  },
                                  // 目前只支持ChunkId/FileId/DirId
                                  object_id: chunkId.calculate_id()
                                  
                              }
  
                              let resp = await source.ndn_service().get_data(req)
                              console.info(`${chunkId} 下载结果：${resp}`)
                              if (resp.err) {
                                  v({ err: true, log: `ndn_service get_data failed` })
                              }
                              //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                              console.info(`下载chunk 成功： ${JSON.stringify(resp)}`)
                              v({ err: false, chunkId: chunkId.calculate_id().to_base_58() })
                          }))
                          }
                          let download = []
                          for (let i in chunkRecvPromise) {
                          let result = await chunkRecvPromise[i]
                          if (result.err) {
                              return { err: result.err, log: result.log }
                          }
                          download.push(result)                        
                          }
                          //清理数据
                          await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                          
                          return { err: false, log: `chunk 下载成功`, download };
                    })
                    //需要增加chunkid与dir的关联
                    it.skip("#NDN权限测试,objectmap_inner_path,get_data,chunk目标对象,来源对象dir",async()=>{
                         //stack
                         let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                         let target = zone2ood.fork_with_new_dec(DecId.DecIdA)
                         //test conf
                         let fileName = RandomGenerator.string(10);
                         let filePath = path.join(__dirname, "./chunk_trans/source/")
                         console.log("filePath",filePath)
                         let chunkSize = 4 * 1024 * 1024
                         let chunkNumber = 10
                         let timeout: number = 600 * 1000                
                         let acl_path = "/test/api/test/"
                         let decid = target.dec_id
 
                         //create test file
                         await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);
 
                         //acl
                         await source.root_state_meta_stub(undefined,undefined).clear_access()
                         await target.root_state_meta_stub(undefined,undefined).clear_access()
                         await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                         await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
 
                         //rmeta
                         let stub_source = source.root_state_stub(undefined,undefined)
                         let stub_target = target.root_state_stub(undefined,undefined)
 
                         let env_acc:cyfs.RootStateOpEnvAccess = {
                         path:acl_path,
                         access:cyfs.AccessPermissions.Full 
                         }
     
                         //vaildate
                         let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()
 
                         let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                         let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                         
                         //初始化数据
                         let stack = [source,source,source,source,source,source,source,source,source,source]
                         let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                          let res= (await trans_chunk_for_getdata(stack,filePath,"\\" + fileName,chunkSize,level))
                          let chunkIdList = res[3]
                          //[object_map_id,file_id_from_objectmap,dir_id,chunkIdList]
                          
 
                         //从target设备get 对象数据
                         console.log("chunkIdList",chunkIdList)
                         let chunkRecvPromise: Array<any> = []
                         for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                             console.log("chunkIdList_i_ ", i)
                             chunkRecvPromise.push(new Promise(async (v) => {
 
                             setTimeout(() => {v({ err: true, log: `ndn_service get_data timeout` })}, timeout)                       
                             let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                             console.info(`开始传输chunk:${chunkId},${buff}`)
 
                             //将chunkid对象id挂在objet_map上
                             console.info("remove_with_path", await op_env_stub_target.remove_with_path(acl_path))
                             let result1 = await op_env_stub_target.insert_with_path(acl_path, res[1].object_id)
                             console.info(`# insert_with_path_result1:${JSON.stringify(result1)}}`)
                             assert.ok(!result1.err)
 
                             let update_result2 = await op_env_stub_source.update()
                             console.info("update_result2",update_result2)
                             assert.ok(!update_result2.err)
 
                             let list_result1 = await op_env_stub_source.list(acl_path)
                             console.info("list_result1",list_result1)
 
 
 
                             //await op_env_stub_source.commit()
                             //调用get_data接口
                             let req: cyfs.NDNGetDataOutputRequest = {
                                 common: {                                   
                                     level: cyfs.NDNAPILevel.NDN,// api级别
                                     dec_id: source.dec_id, //这里可以模拟当前dec_id
                                     target: target.local_device_id().object_id,
                                     // 需要处理数据的关联对象，主要用以chunk/file等+-
                                     referer_object: [new cyfs.NDNDataRefererObject(undefined,res[1].object_id)],
                                     flags: 0,
                                     req_path: path_handler//如果没有DecId，那么就当当前decid处理
                                 },
                                 // 目前只支持ChunkId/FileId/DirId
                                 object_id: chunkId.calculate_id()
                                 
                             }
 
                             let resp = await source.ndn_service().get_data(req)
                             console.info(`${chunkId} 下载结果：${resp}`)
                             if (resp.err) {
                                 v({ err: true, log: `ndn_service get_data failed` })
                             }
                             //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                             console.info(`下载chunk 成功： ${JSON.stringify(resp)}`)
                             v({ err: false, chunkId: chunkId.calculate_id().to_base_58() })
                         }))
                         }
                         let download = []
                         for (let i in chunkRecvPromise) {
                         let result = await chunkRecvPromise[i]
                         if (result.err) {
                             return { err: result.err, log: result.log }
                         }
                         download.push(result)                        
                         }
                         //清理数据
                         await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                         
                         return { err: false, log: `chunk 下载成功`, download };

                    })
                    it("#NDN权限测试,objectmap_inner_path,get_data,chunk目标对象,来源对象objectmap+inner_path",async()=>{
                        //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone2ood.fork_with_new_dec(DecId.DecIdA)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                         let res= (await trans_chunk_for_getdata(stack,filePath,"\\" + fileName,chunkSize,level))
                         let chunkIdList = res[3]
                         //[object_map_id,file_id_from_objectmap,dir_id,chunkIdList]
                         

                        //从target设备get 对象数据
                        console.log("chunkIdList",chunkIdList)
                        let chunkRecvPromise: Array<any> = []
                        for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                            console.log("chunkIdList_i_ ", i)
                            chunkRecvPromise.push(new Promise(async (v) => {

                            setTimeout(() => {v({ err: true, log: `ndn_service get_data timeout` })}, timeout)                       
                            let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                            console.info(`开始传输chunk:${chunkId},${buff}`)

                            //将chunkid对象id挂在objet_map上
                            console.info("remove_with_path", await op_env_stub_target.remove_with_path(acl_path))
                            let result1 = await op_env_stub_target.insert_with_path(acl_path, res[1].object_id)
                            console.info(`# insert_with_path_result1:${JSON.stringify(result1)}}`)
                            assert.ok(!result1.err)

                            let update_result2 = await op_env_stub_source.update()
                            console.info("update_result2",update_result2)
                            assert.ok(!update_result2.err)

                            let list_result1 = await op_env_stub_source.list(acl_path)
                            console.info("list_result1",list_result1)



                            //await op_env_stub_source.commit()
                            //调用get_data接口
                            let req: cyfs.NDNGetDataOutputRequest = {
                                common: {                                   
                                    level: cyfs.NDNAPILevel.NDN,// api级别
                                    dec_id: source.dec_id, //这里可以模拟当前dec_id
                                    target: target.local_device_id().object_id,
                                    // 需要处理数据的关联对象，主要用以chunk/file等+-
                                    referer_object: [new cyfs.NDNDataRefererObject(undefined,res[0].object_id,"/" + fileName)],
                                    flags: 0,
                                    req_path: path_handler//如果没有DecId，那么就当当前decid处理
                                },
                                // 目前只支持ChunkId/FileId/DirId
                                object_id: chunkId.calculate_id()
                                
                            }

                            let resp = await source.ndn_service().get_data(req)
                            console.info(`${chunkId} 下载结果：${resp}`)
                            if (resp.err) {
                                v({ err: true, log: `ndn_service get_data failed` })
                            }
                            //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                            console.info(`下载chunk 成功： ${JSON.stringify(resp)}`)
                            v({ err: false, chunkId: chunkId.calculate_id().to_base_58() })
                        }))
                        }
                        let download = []
                        for (let i in chunkRecvPromise) {
                        let result = await chunkRecvPromise[i]
                        if (result.err) {
                            return { err: result.err, log: result.log }
                        }
                        download.push(result)                        
                        }
                        //清理数据
                        await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                        
                        return { err: false, log: `chunk 下载成功`, download };
                    })
                    it("#NDN权限测试,objectmap_inner_path,get_data,File目标对象",async()=>{
                        //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone2ood.fork_with_new_dec(DecId.DecIdA)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                        let res= (await trans_chunk_for_getdata(stack,filePath,"\\" + fileName,chunkSize,level))
                        let file_id = res[1].object_id
                        //[object_map_id,file_id_from_objectmap,dir_id,chunkIdList]
                      
                        //将file对象id挂在objet_map上
                        console.info("remove_with_path", await op_env_stub_target.remove_with_path(acl_path))
                        let result1 = await op_env_stub_target.insert_with_path(acl_path, file_id)
                        console.info(`# insert_with_path_result1:${JSON.stringify(result1)}}`)
                        assert.ok(!result1.err)

                        let update_result2 = await op_env_stub_source.update()
                        console.info("update_result2",update_result2)
                        assert.ok(!update_result2.err)

                        let list_result1 = await op_env_stub_source.list(acl_path)
                        console.info("list_result1",list_result1)

                        //await op_env_stub_source.commit()
                        //调用get_data接口
                        let req: cyfs.NDNGetDataOutputRequest = {
                            common: {                                   
                                level: cyfs.NDNAPILevel.NDN,// api级别
                                dec_id: source.dec_id, //这里可以模拟当前dec_id
                                target: target.local_device_id().object_id,
                                // 需要处理数据的关联对象，主要用以chunk/file等+-
                                referer_object: [],
                                flags: 0,
                                req_path: path_handler//如果没有DecId，那么就当当前decid处理
                            },
                            // 目前只支持ChunkId/FileId/DirId
                            object_id: file_id
                            
                        }

                        let resp = await source.ndn_service().get_data(req)
                        console.info(`${file_id} 下载结果：${resp}`)
                        if (resp.err) {
                            console.info({ err: true, log: `ndn_service get_data failed` })
                        }
                        //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                        console.info(`下载file 成功： ${JSON.stringify(resp)}`)

                        //清理数据
                        await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                        
                        return { err: false, log: `file 下载成功`};
                    })
                    it("#NDN权限测试,objectmap_inner_path,get_data,File目标对象,来源对象objectmap_inner_path",async()=>{
                        //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone2ood.fork_with_new_dec(DecId.DecIdA)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                        let res= (await trans_chunk_for_getdata(stack,filePath,"\\" + fileName,chunkSize,level))
                        let file_id = res[1].object_id
                        //[object_map_id,file_id_from_objectmap,dir_id,chunkIdList]
                        
                        //将file对象id挂在objet_map上
                        console.info("remove_with_path", await op_env_stub_target.remove_with_path(acl_path))
                        let result1 = await op_env_stub_target.insert_with_path(acl_path, file_id)
                        console.info(`# insert_with_path_result1:${JSON.stringify(result1)}}`)
                        assert.ok(!result1.err)

                        let update_result2 = await op_env_stub_source.update()
                        console.info("update_result2",update_result2)
                        assert.ok(!update_result2.err)

                        let list_result1 = await op_env_stub_source.list(acl_path)
                        console.info("list_result1",list_result1)

                        //await op_env_stub_source.commit()
                        //调用get_data接口
                        let req: cyfs.NDNGetDataOutputRequest = {
                            common: {                                   
                                level: cyfs.NDNAPILevel.NDN,// api级别
                                dec_id: source.dec_id, //这里可以模拟当前dec_id
                                target: target.local_device_id().object_id,
                                // 需要处理数据的关联对象，主要用以chunk/file等+-
                                referer_object: [new cyfs.NDNDataRefererObject(undefined,res[0].object_id,"/" + fileName)],
                                flags: 0,
                                req_path: path_handler//如果没有DecId，那么就当当前decid处理
                            },
                            // 目前只支持ChunkId/FileId/DirId
                            object_id: file_id
                            
                        }

                        let resp = await source.ndn_service().get_data(req)
                        console.info(`${file_id} 下载结果：${resp}`)
                        if (resp.err) {
                            console.info({ err: true, log: `ndn_service get_data failed` })
                        }
                        //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                        console.info(`下载file 成功： ${JSON.stringify(resp)}`)

                        //清理数据
                        await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                        
                        return { err: false, log: `file 下载成功`};
                    })
                    it("#NDN权限测试,objectmap_inner_path,get_data,objectmap_inner_path目标对象",async()=>{
                        //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone2ood.fork_with_new_dec(DecId.DecIdA)
                        
                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                        let res= (await trans_chunk_for_getdata(stack,filePath,"\\" + fileName,chunkSize,level))
                        let file_id = res[1].object_id
                        //[object_map_id,file_id_from_objectmap,dir_id,chunkIdList]
                        
                        //将file对象id挂在objet_map上
                        console.info("remove_with_path", await op_env_stub_target.remove_with_path(acl_path))
                        let result1 = await op_env_stub_target.insert_with_path(acl_path, file_id)
                        console.info(`# insert_with_path_result1:${JSON.stringify(result1)}}`)
                        assert.ok(!result1.err)

                        let update_result2 = await op_env_stub_source.update()
                        console.info("update_result2",update_result2)
                        assert.ok(!update_result2.err)

                        let list_result1 = await op_env_stub_source.list(acl_path)
                        console.info("list_result1",list_result1)

                        //await op_env_stub_source.commit()
                        //调用get_data接口
                        let req: cyfs.NDNGetDataOutputRequest = {
                            common: {                                   
                                level: cyfs.NDNAPILevel.NDN,// api级别
                                dec_id: source.dec_id, //这里可以模拟当前dec_id
                                target: target.local_device_id().object_id,
                                // 需要处理数据的关联对象，主要用以chunk/file等+-
                                referer_object: [],
                                flags: 0,
                                req_path: path_handler//如果没有DecId，那么就当当前decid处理
                            },
                            // 目前只支持ChunkId/FileId/DirId
                            inner_path: "/" + fileName,
                            object_id: res[0].object_id
                            
                        }

                        let resp = await source.ndn_service().get_data(req)
                        console.info(`${file_id} 下载结果：${resp}`)
                        if (resp.err) {
                            console.info({ err: true, log: `ndn_service get_data failed` })
                        }
                        //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                        console.info(`下载file 成功： ${JSON.stringify(resp)}`)

                        //清理数据
                        await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                        
                        return { err: false, log: `file 下载成功`};
                    
                    })
                describe.skip("#NDN权限测试,objectmap_inner_path,trans_createtask",async()=>{
                    it("#NDN权限测试,objectmap_inner_path,trans_createtask,chunk目标对象",async()=>{
                    })
                    it("#NDN权限测试,objectmap_inner_path,trans_createtask,chunk目标对象,来源对象file",async()=>{
                    })
                    it("#NDN权限测试,objectmap_inner_path,trans_createtask,chunk目标对象,来源对象dir",async()=>{
                    })
                    it("#NDN权限测试,objectmap_inner_path,trans_createtask,chunk目标对象,来源对象objectmap+inner_path",async()=>{
                    })
                    it("#NDN权限测试,objectmap_inner_path,trans_createtask,File目标对象",async()=>{
                    })
                    it("#NDN权限测试,objectmap_inner_path,trans_createtask,File目标对象,来源对象objectmap_inner_path",async()=>{
                    })
                })
            })
            describe("#NDN权限测试,objectmap_inner_path,不同zone不同dec",async()=>{
                describe("#NDN权限测试,objectmap_inner_path,getdata",async()=>{
                    describe("#NDN权限测试,objectmap_inner_path,getdata",async()=>{
                        //this.beforeEach(function(){});
                        //this.afterEach(function(){});
                        it("#NDN权限测试,objectmap_inner_path,getdata,chunk目标对象",async()=>{
                            //stack
                            let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                            let target = zone2ood.fork_with_new_dec(DecId.DecIdB)
    
                            //test conf
                            let fileName = RandomGenerator.string(10);
                            let filePath = path.join(__dirname, "./chunk_trans/source/")
                            console.log("filePath",filePath)
                            let chunkSize = 4 * 1024 * 1024
                            let chunkNumber = 10
                            let timeout: number = 600 * 1000                
                            let acl_path = "/test/api/test/"
                            let root_path = "/123/test/"
                            let decid = target.dec_id
    
                            //create test file
                            await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);
    
                            //acl
                            await source.root_state_meta_stub(undefined,undefined).clear_access()
                            await target.root_state_meta_stub(undefined,undefined).clear_access()
                            await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                            await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
    
                            //rmeta
                            let stub_source = source.root_state_stub(undefined,undefined)
                            let stub_target = target.root_state_stub(undefined,undefined)
    
                            let env_acc:cyfs.RootStateOpEnvAccess = {
                            path:acl_path,
                            access:cyfs.AccessPermissions.Full 
                            }
        
                            //vaildate
                            let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()
    
                            let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                            let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                            
                            //初始化数据
                            let stack = [source,source,source,source,source,source,source,source,source,source]
                            let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                             let res= (await trans_chunk_for_getdata(stack,filePath,"\\" + fileName,chunkSize,level))
                             let chunkIdList = res[3]
                             
    
                            //从target设备get 对象数据
                            console.log("chunkIdList",chunkIdList)
                            let chunkRecvPromise: Array<any> = []
                            for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                                console.log("chunkIdList_i_ ", i)
                                chunkRecvPromise.push(new Promise(async (v) => {
    
                                setTimeout(() => {v({ err: true, log: `ndn_service get_data timeout` })}, timeout)                       
                                let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                                console.info(`开始传输chunk:${chunkId},${buff}`)
    
                                //将chunkid对象id挂在objet_map上
                                console.info("remove_with_path", await op_env_stub_target.remove_with_path(acl_path))
                                let result1 = await op_env_stub_target.insert_with_path(acl_path, chunkId.calculate_id())
                                console.info(`# insert_with_path_result1:${JSON.stringify(result1)}}`)
                                assert.ok(!result1.err)
    
                                let update_result2 = await op_env_stub_source.update()
                                console.info("update_result2",update_result2)
                                assert.ok(!update_result2.err)
    
                                let list_result1 = await op_env_stub_source.list(acl_path)
                                console.info("list_result1",list_result1)
    
    
    
                                //await op_env_stub_source.commit()
                                //调用get_data接口
                                let req: cyfs.NDNGetDataOutputRequest = {
                                    common: {                                   
                                        level: cyfs.NDNAPILevel.NDN,// api级别
                                        dec_id: source.dec_id, //这里可以模拟当前dec_id
                                        target: target.local_device_id().object_id,
                                        // 需要处理数据的关联对象，主要用以chunk/file等+-
                                        referer_object: [],
                                        flags: 0,
                                        req_path: path_handler//如果没有DecId，那么就当当前decid处理
                                    },
                                    // 目前只支持ChunkId/FileId/DirId
                                    object_id: chunkId.calculate_id()
                                    
                                }
    
                                let resp = await source.ndn_service().get_data(req)
                                console.info(`${chunkId} 下载结果：${resp}`)
                                if (resp.err) {
                                    v({ err: true, log: `ndn_service get_data failed` })
                                }
                                //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                                console.info(`下载chunk 成功： ${JSON.stringify(resp)}`)
                                v({ err: false, chunkId: chunkId.calculate_id().to_base_58() })
                            }))
                            }
                            let download = []
                            for (let i in chunkRecvPromise) {
                            let result = await chunkRecvPromise[i]
                            if (result.err) {
                                return { err: result.err, log: result.log }
                            }
                            download.push(result)                        
                            }
                            //清理数据
                            await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                            
                            return { err: false, log: `chunk 下载成功`, download };
                        })
                        it("#NDN权限测试,objectmap_inner_path,get_data,chunk目标对象,来源对象file",async()=>{
                              //stack
                              let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                              let target = zone2ood.fork_with_new_dec(DecId.DecIdB)
      
                              //test conf
                              let fileName = RandomGenerator.string(10);
                              let filePath = path.join(__dirname, "./chunk_trans/source/")
                              console.log("filePath",filePath)
                              let chunkSize = 4 * 1024 * 1024
                              let chunkNumber = 10
                              let timeout: number = 600 * 1000                
                              let acl_path = "/test/api/test/"
                              let decid = target.dec_id
      
                              //create test file
                              await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);
      
                              //acl
                              await source.root_state_meta_stub(undefined,undefined).clear_access()
                              await target.root_state_meta_stub(undefined,undefined).clear_access()
                              await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                              await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
      
                              //rmeta
                              let stub_source = source.root_state_stub(undefined,undefined)
                              let stub_target = target.root_state_stub(undefined,undefined)
      
                              let env_acc:cyfs.RootStateOpEnvAccess = {
                              path:acl_path,
                              access:cyfs.AccessPermissions.Full 
                              }
          
                              //vaildate
                              let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()
      
                              let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                              let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                              
                              //初始化数据
                              let stack = [source,source,source,source,source,source,source,source,source,source]
                              let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                               let res= (await trans_chunk_for_getdata(stack,filePath,"\\" + fileName,chunkSize,level))
                               let chunkIdList = res[3]
                               //[object_map_id,file_id_from_objectmap,dir_id,chunkIdList]
                               
      
                              //从target设备get 对象数据
                              console.log("chunkIdList",chunkIdList)
                              let chunkRecvPromise: Array<any> = []
                              for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                                  console.log("chunkIdList_i_ ", i)
                                  chunkRecvPromise.push(new Promise(async (v) => {
      
                                  setTimeout(() => {v({ err: true, log: `ndn_service get_data timeout` })}, timeout)                       
                                  let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                                  console.info(`开始传输chunk:${chunkId},${buff}`)
      
                                  //将chunkid对象id挂在objet_map上
                                  console.info("remove_with_path", await op_env_stub_target.remove_with_path(acl_path))
                                  let result1 = await op_env_stub_target.insert_with_path(acl_path, res[1].object_id)
                                  console.info(`# insert_with_path_result1:${JSON.stringify(result1)}}`)
                                  assert.ok(!result1.err)
      
                                  let update_result2 = await op_env_stub_source.update()
                                  console.info("update_result2",update_result2)
                                  assert.ok(!update_result2.err)
      
                                  let list_result1 = await op_env_stub_source.list(acl_path)
                                  console.info("list_result1",list_result1)
      
      
      
                                  //await op_env_stub_source.commit()
                                  //调用get_data接口
                                  let req: cyfs.NDNGetDataOutputRequest = {
                                      common: {                                   
                                          level: cyfs.NDNAPILevel.NDN,// api级别
                                          dec_id: source.dec_id, //这里可以模拟当前dec_id
                                          target: target.local_device_id().object_id,
                                          // 需要处理数据的关联对象，主要用以chunk/file等+-
                                          referer_object: [new cyfs.NDNDataRefererObject(undefined,res[1].object_id)],
                                          flags: 0,
                                          req_path: path_handler//如果没有DecId，那么就当当前decid处理
                                      },
                                      // 目前只支持ChunkId/FileId/DirId
                                      object_id: chunkId.calculate_id()
                                      
                                  }
      
                                  let resp = await source.ndn_service().get_data(req)
                                  console.info(`${chunkId} 下载结果：${resp}`)
                                  if (resp.err) {
                                      v({ err: true, log: `ndn_service get_data failed` })
                                  }
                                  //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                                  console.info(`下载chunk 成功： ${JSON.stringify(resp)}`)
                                  v({ err: false, chunkId: chunkId.calculate_id().to_base_58() })
                              }))
                              }
                              let download = []
                              for (let i in chunkRecvPromise) {
                              let result = await chunkRecvPromise[i]
                              if (result.err) {
                                  return { err: result.err, log: result.log }
                              }
                              download.push(result)                        
                              }
                              //清理数据
                              await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                              
                              return { err: false, log: `chunk 下载成功`, download };
                        })
                        //需要增加chunkid与dir的关联
                        it.skip("#NDN权限测试,objectmap_inner_path,get_data,chunk目标对象,来源对象dir",async()=>{
                             //stack
                             let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                             let target = zone2ood.fork_with_new_dec(DecId.DecIdB)

                             let fileName = RandomGenerator.string(10);
                             let filePath = path.join(__dirname, "./chunk_trans/source/")
                             console.log("filePath",filePath)
                             let chunkSize = 4 * 1024 * 1024
                             let chunkNumber = 10
                             let timeout: number = 600 * 1000                
                             let acl_path = "/test/api/test/"
                             let decid = target.dec_id
     
                             //create test file
                             await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);
     
                             //acl
                             await source.root_state_meta_stub(undefined,undefined).clear_access()
                             await target.root_state_meta_stub(undefined,undefined).clear_access()
                             await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                             await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
     
                             //rmeta
                             let stub_source = source.root_state_stub(undefined,undefined)
                             let stub_target = target.root_state_stub(undefined,undefined)
     
                             let env_acc:cyfs.RootStateOpEnvAccess = {
                             path:acl_path,
                             access:cyfs.AccessPermissions.Full 
                             }
         
                             //vaildate
                             let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()
     
                             let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                             let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                             
                             //初始化数据
                             let stack = [source,source,source,source,source,source,source,source,source,source]
                             let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                              let res= (await trans_chunk_for_getdata(stack,filePath,"\\" + fileName,chunkSize,level))
                              let chunkIdList = res[3]
                              //[object_map_id,file_id_from_objectmap,dir_id,chunkIdList]
                              
     
                             //从target设备get 对象数据
                             console.log("chunkIdList",chunkIdList)
                             let chunkRecvPromise: Array<any> = []
                             for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                                 console.log("chunkIdList_i_ ", i)
                                 chunkRecvPromise.push(new Promise(async (v) => {
     
                                 setTimeout(() => {v({ err: true, log: `ndn_service get_data timeout` })}, timeout)                       
                                 let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                                 console.info(`开始传输chunk:${chunkId},${buff}`)
     
                                 //将chunkid对象id挂在objet_map上
                                 console.info("remove_with_path", await op_env_stub_target.remove_with_path(acl_path))
                                 let result1 = await op_env_stub_target.insert_with_path(acl_path, res[1].object_id)
                                 console.info(`# insert_with_path_result1:${JSON.stringify(result1)}}`)
                                 assert.ok(!result1.err)
     
                                 let update_result2 = await op_env_stub_source.update()
                                 console.info("update_result2",update_result2)
                                 assert.ok(!update_result2.err)
     
                                 let list_result1 = await op_env_stub_source.list(acl_path)
                                 console.info("list_result1",list_result1)
     
     
     
                                 //await op_env_stub_source.commit()
                                 //调用get_data接口
                                 let req: cyfs.NDNGetDataOutputRequest = {
                                     common: {                                   
                                         level: cyfs.NDNAPILevel.NDN,// api级别
                                         dec_id: source.dec_id, //这里可以模拟当前dec_id
                                         target: target.local_device_id().object_id,
                                         // 需要处理数据的关联对象，主要用以chunk/file等+-
                                         referer_object: [new cyfs.NDNDataRefererObject(undefined,res[1].object_id)],
                                         flags: 0,
                                         req_path: path_handler//如果没有DecId，那么就当当前decid处理
                                     },
                                     // 目前只支持ChunkId/FileId/DirId
                                     object_id: chunkId.calculate_id()
                                     
                                 }
     
                                 let resp = await source.ndn_service().get_data(req)
                                 console.info(`${chunkId} 下载结果：${resp}`)
                                 if (resp.err) {
                                     v({ err: true, log: `ndn_service get_data failed` })
                                 }
                                 //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                                 console.info(`下载chunk 成功： ${JSON.stringify(resp)}`)
                                 v({ err: false, chunkId: chunkId.calculate_id().to_base_58() })
                             }))
                             }
                             let download = []
                             for (let i in chunkRecvPromise) {
                             let result = await chunkRecvPromise[i]
                             if (result.err) {
                                 return { err: result.err, log: result.log }
                             }
                             download.push(result)                        
                             }
                             //清理数据
                             await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                             
                             return { err: false, log: `chunk 下载成功`, download };
    
                        })
                        it("#NDN权限测试,objectmap_inner_path,get_data,chunk目标对象,来源对象objectmap+inner_path",async()=>{
                            //stack
                            let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                            let target = zone2ood.fork_with_new_dec(DecId.DecIdB)
    
                            //test conf
                            let fileName = RandomGenerator.string(10);
                            let filePath = path.join(__dirname, "./chunk_trans/source/")
                            console.log("filePath",filePath)
                            let chunkSize = 4 * 1024 * 1024
                            let chunkNumber = 10
                            let timeout: number = 600 * 1000                
                            let acl_path = "/test/api/test/"
                            let decid = target.dec_id
    
                            //create test file
                            await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);
    
                            //acl
                            await source.root_state_meta_stub(undefined,undefined).clear_access()
                            await target.root_state_meta_stub(undefined,undefined).clear_access()
                            await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                            await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
    
                            //rmeta
                            let stub_source = source.root_state_stub(undefined,undefined)
                            let stub_target = target.root_state_stub(undefined,undefined)
    
                            let env_acc:cyfs.RootStateOpEnvAccess = {
                            path:acl_path,
                            access:cyfs.AccessPermissions.Full 
                            }
        
                            //vaildate
                            let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()
    
                            let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                            let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                            
                            //初始化数据
                            let stack = [source,source,source,source,source,source,source,source,source,source]
                            let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                             let res= (await trans_chunk_for_getdata(stack,filePath,"\\" + fileName,chunkSize,level))
                             let chunkIdList = res[3]
                             //[object_map_id,file_id_from_objectmap,dir_id,chunkIdList]
                             
    
                            //从target设备get 对象数据
                            console.log("chunkIdList",chunkIdList)
                            let chunkRecvPromise: Array<any> = []
                            for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                                console.log("chunkIdList_i_ ", i)
                                chunkRecvPromise.push(new Promise(async (v) => {
    
                                setTimeout(() => {v({ err: true, log: `ndn_service get_data timeout` })}, timeout)                       
                                let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                                console.info(`开始传输chunk:${chunkId},${buff}`)
    
                                //将chunkid对象id挂在objet_map上
                                console.info("remove_with_path", await op_env_stub_target.remove_with_path(acl_path))
                                let result1 = await op_env_stub_target.insert_with_path(acl_path, res[1].object_id)
                                console.info(`# insert_with_path_result1:${JSON.stringify(result1)}}`)
                                assert.ok(!result1.err)
    
                                let update_result2 = await op_env_stub_source.update()
                                console.info("update_result2",update_result2)
                                assert.ok(!update_result2.err)
    
                                let list_result1 = await op_env_stub_source.list(acl_path)
                                console.info("list_result1",list_result1)
    
    
    
                                //await op_env_stub_source.commit()
                                //调用get_data接口
                                let req: cyfs.NDNGetDataOutputRequest = {
                                    common: {                                   
                                        level: cyfs.NDNAPILevel.NDN,// api级别
                                        dec_id: source.dec_id, //这里可以模拟当前dec_id
                                        target: target.local_device_id().object_id,
                                        // 需要处理数据的关联对象，主要用以chunk/file等+-
                                        referer_object: [new cyfs.NDNDataRefererObject(undefined,res[0].object_id,"/" + fileName)],
                                        flags: 0,
                                        req_path: path_handler//如果没有DecId，那么就当当前decid处理
                                    },
                                    // 目前只支持ChunkId/FileId/DirId
                                    object_id: chunkId.calculate_id()
                                    
                                }
    
                                let resp = await source.ndn_service().get_data(req)
                                console.info(`${chunkId} 下载结果：${resp}`)
                                if (resp.err) {
                                    v({ err: true, log: `ndn_service get_data failed` })
                                }
                                //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                                console.info(`下载chunk 成功： ${JSON.stringify(resp)}`)
                                v({ err: false, chunkId: chunkId.calculate_id().to_base_58() })
                            }))
                            }
                            let download = []
                            for (let i in chunkRecvPromise) {
                            let result = await chunkRecvPromise[i]
                            if (result.err) {
                                return { err: result.err, log: result.log }
                            }
                            download.push(result)                        
                            }
                            //清理数据
                            await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                            
                            return { err: false, log: `chunk 下载成功`, download };
                        })
                        it("#NDN权限测试,objectmap_inner_path,get_data,File目标对象",async()=>{
                            //stack
                            let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                            let target = zone2ood.fork_with_new_dec(DecId.DecIdB)
    
                            //test conf
                            let fileName = RandomGenerator.string(10);
                            let filePath = path.join(__dirname, "./chunk_trans/source/")
                            console.log("filePath",filePath)
                            let chunkSize = 4 * 1024 * 1024
                            let chunkNumber = 10
                            let timeout: number = 600 * 1000                
                            let acl_path = "/test/api/test/"
                            let decid = target.dec_id
    
                            //create test file
                            await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);
    
                            //acl
                            await source.root_state_meta_stub(undefined,undefined).clear_access()
                            await target.root_state_meta_stub(undefined,undefined).clear_access()
                            await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                            await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
    
                            //rmeta
                            let stub_source = source.root_state_stub(undefined,undefined)
                            let stub_target = target.root_state_stub(undefined,undefined)
    
                            let env_acc:cyfs.RootStateOpEnvAccess = {
                            path:acl_path,
                            access:cyfs.AccessPermissions.Full 
                            }
        
                            //vaildate
                            let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()
    
                            let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                            let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                            
                            //初始化数据
                            let stack = [source,source,source,source,source,source,source,source,source,source]
                            let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                            let res= (await trans_chunk_for_getdata(stack,filePath,"\\" + fileName,chunkSize,level))
                            let file_id = res[1].object_id
                            //[object_map_id,file_id_from_objectmap,dir_id,chunkIdList]
                          
                            //将file对象id挂在objet_map上
                            console.info("remove_with_path", await op_env_stub_target.remove_with_path(acl_path))
                            let result1 = await op_env_stub_target.insert_with_path(acl_path, file_id)
                            console.info(`# insert_with_path_result1:${JSON.stringify(result1)}}`)
                            assert.ok(!result1.err)
    
                            let update_result2 = await op_env_stub_source.update()
                            console.info("update_result2",update_result2)
                            assert.ok(!update_result2.err)
    
                            let list_result1 = await op_env_stub_source.list(acl_path)
                            console.info("list_result1",list_result1)
    
                            //await op_env_stub_source.commit()
                            //调用get_data接口
                            let req: cyfs.NDNGetDataOutputRequest = {
                                common: {                                   
                                    level: cyfs.NDNAPILevel.NDN,// api级别
                                    dec_id: source.dec_id, //这里可以模拟当前dec_id
                                    target: target.local_device_id().object_id,
                                    // 需要处理数据的关联对象，主要用以chunk/file等+-
                                    referer_object: [],
                                    flags: 0,
                                    req_path: path_handler//如果没有DecId，那么就当当前decid处理
                                },
                                // 目前只支持ChunkId/FileId/DirId
                                object_id: file_id
                                
                            }
    
                            let resp = await source.ndn_service().get_data(req)
                            console.info(`${file_id} 下载结果：${resp}`)
                            if (resp.err) {
                                console.info({ err: true, log: `ndn_service get_data failed` })
                            }
                            //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                            console.info(`下载file 成功： ${JSON.stringify(resp)}`)
    
                            //清理数据
                            await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                            
                            return { err: false, log: `file 下载成功`};
                        })
                        it("#NDN权限测试,objectmap_inner_path,get_data,File目标对象,来源对象objectmap_inner_path",async()=>{
                            //stack
                            let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                            let target = zone2ood.fork_with_new_dec(DecId.DecIdB)
    
                            //test conf
                            let fileName = RandomGenerator.string(10);
                            let filePath = path.join(__dirname, "./chunk_trans/source/")
                            console.log("filePath",filePath)
                            let chunkSize = 4 * 1024 * 1024
                            let chunkNumber = 10
                            let timeout: number = 600 * 1000                
                            let acl_path = "/test/api/test/"
                            let decid = target.dec_id
    
                            //create test file
                            await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);
    
                            //acl
                            await source.root_state_meta_stub(undefined,undefined).clear_access()
                            await target.root_state_meta_stub(undefined,undefined).clear_access()
                            await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                            await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
    
                            //rmeta
                            let stub_source = source.root_state_stub(undefined,undefined)
                            let stub_target = target.root_state_stub(undefined,undefined)
    
                            let env_acc:cyfs.RootStateOpEnvAccess = {
                            path:acl_path,
                            access:cyfs.AccessPermissions.Full 
                            }
        
                            //vaildate
                            let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()
    
                            let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                            let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                            
                            //初始化数据
                            let stack = [source,source,source,source,source,source,source,source,source,source]
                            let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                            let res= (await trans_chunk_for_getdata(stack,filePath,"\\" + fileName,chunkSize,level))
                            let file_id = res[1].object_id
                            //[object_map_id,file_id_from_objectmap,dir_id,chunkIdList]
                            
                            //将file对象id挂在objet_map上
                            console.info("remove_with_path", await op_env_stub_target.remove_with_path(acl_path))
                            let result1 = await op_env_stub_target.insert_with_path(acl_path, file_id)
                            console.info(`# insert_with_path_result1:${JSON.stringify(result1)}}`)
                            assert.ok(!result1.err)
    
                            let update_result2 = await op_env_stub_source.update()
                            console.info("update_result2",update_result2)
                            assert.ok(!update_result2.err)
    
                            let list_result1 = await op_env_stub_source.list(acl_path)
                            console.info("list_result1",list_result1)
    
                            //await op_env_stub_source.commit()
                            //调用get_data接口
                            let req: cyfs.NDNGetDataOutputRequest = {
                                common: {                                   
                                    level: cyfs.NDNAPILevel.NDN,// api级别
                                    dec_id: source.dec_id, //这里可以模拟当前dec_id
                                    target: target.local_device_id().object_id,
                                    // 需要处理数据的关联对象，主要用以chunk/file等+-
                                    referer_object: [new cyfs.NDNDataRefererObject(undefined,res[0].object_id,"/" + fileName)],
                                    flags: 0,
                                    req_path: path_handler//如果没有DecId，那么就当当前decid处理
                                },
                                // 目前只支持ChunkId/FileId/DirId
                                object_id: file_id
                                
                            }
    
                            let resp = await source.ndn_service().get_data(req)
                            console.info(`${file_id} 下载结果：${resp}`)
                            if (resp.err) {
                                console.info({ err: true, log: `ndn_service get_data failed` })
                            }
                            //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                            console.info(`下载file 成功： ${JSON.stringify(resp)}`)
    
                            //清理数据
                            await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                            
                            return { err: false, log: `file 下载成功`};
                        })
                        it("#NDN权限测试,objectmap_inner_path,get_data,objectmap_inner_path目标对象",async()=>{
                            //stack
                            let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                            let target = zone2ood.fork_with_new_dec(DecId.DecIdB)
                            
                            //test conf
                            let fileName = RandomGenerator.string(10);
                            let filePath = path.join(__dirname, "./chunk_trans/source/")
                            console.log("filePath",filePath)
                            let chunkSize = 4 * 1024 * 1024
                            let chunkNumber = 10
                            let timeout: number = 600 * 1000                
                            let acl_path = "/test/api/test/"
                            let decid = target.dec_id
    
                            //create test file
                            await RandomGenerator.createRandomFile(filePath, fileName, 1 * 1024 * 1024);
    
                            //acl
                            await source.root_state_meta_stub(undefined,undefined).clear_access()
                            await target.root_state_meta_stub(undefined,undefined).clear_access()
                            await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                            await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
    
                            //rmeta
                            let stub_source = source.root_state_stub(undefined,undefined)
                            let stub_target = target.root_state_stub(undefined,undefined)
    
                            let env_acc:cyfs.RootStateOpEnvAccess = {
                            path:acl_path,
                            access:cyfs.AccessPermissions.Full 
                            }
        
                            //vaildate
                            let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()
    
                            let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                            let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                            
                            //初始化数据
                            let stack = [source,source,source,source,source,source,source,source,source,source]
                            let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                            let res= (await trans_chunk_for_getdata(stack,filePath,"\\" + fileName,chunkSize,level))
                            let file_id = res[1].object_id
                            //[object_map_id,file_id_from_objectmap,dir_id,chunkIdList]
                            
                            //将file对象id挂在objet_map上
                            console.info("remove_with_path", await op_env_stub_target.remove_with_path(acl_path))
                            let result1 = await op_env_stub_target.insert_with_path(acl_path, file_id)
                            console.info(`# insert_with_path_result1:${JSON.stringify(result1)}}`)
                            assert.ok(!result1.err)
    
                            let update_result2 = await op_env_stub_source.update()
                            console.info("update_result2",update_result2)
                            assert.ok(!update_result2.err)
    
                            let list_result1 = await op_env_stub_source.list(acl_path)
                            console.info("list_result1",list_result1)
    
                            //await op_env_stub_source.commit()
                            //调用get_data接口
                            let req: cyfs.NDNGetDataOutputRequest = {
                                common: {                                   
                                    level: cyfs.NDNAPILevel.NDN,// api级别
                                    dec_id: source.dec_id, //这里可以模拟当前dec_id
                                    target: target.local_device_id().object_id,
                                    // 需要处理数据的关联对象，主要用以chunk/file等+-
                                    referer_object: [],
                                    flags: 0,
                                    req_path: path_handler//如果没有DecId，那么就当当前decid处理
                                },
                                // 目前只支持ChunkId/FileId/DirId
                                inner_path: "/" + fileName,
                                object_id: res[0].object_id
                                
                            }
    
                            let resp = await source.ndn_service().get_data(req)
                            console.info(`${file_id} 下载结果：${resp}`)
                            if (resp.err) {
                                console.info({ err: true, log: `ndn_service get_data failed` })
                            }
                            //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                            console.info(`下载file 成功： ${JSON.stringify(resp)}`)
    
                            //清理数据
                            await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)
                            
                            return { err: false, log: `file 下载成功`};
                        
                        })
                })
                describe.skip("#NDN权限测试,objectmap_inner_path,trans_createtask",async()=>{
                    it("#NDN权限测试,objectmap_inner_path,trans_createtask,chunk目标对象",async()=>{
                                               //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1ood.fork_with_new_dec(DecId.DecIdB)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        let savePath = path.join(__dirname, "./chunk_trans/target/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let root_path = "/123/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 10 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                        let res= (await trans_file_for_task(stack,filePath,"\\" + fileName,chunkSize,level))
                        let chunkIdList = res[1]
                        
                        //将file对象id挂在objet_map上
                        let file_id = res[0]
                        console.info("res_file_id",file_id)
                         
                        //从target设备get 对象数据
                        console.log("chunkIdList_length",chunkIdList!.length)
                        let chunkRecvPromise: Array<any> = []
                        for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                            console.log("chunkIdList_i_ ", i)
                            chunkRecvPromise.push(new Promise(async (v) => {
                     
                                let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                                console.info(`开始传输chunk:${chunkId},${buff}`)

                                //将chunkid对象id挂在objet_map上
                                //4. target 设备 start_task 开始下载文件
                                
                                let create_task = (await source.trans().create_task({
                                    common: {
                                        level: cyfs.NDNAPILevel.NDN,
                                        flags: 0,
                                        dec_id: source.dec_id,
                                        target: target.local_device_id().object_id,
                                        //referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)]
                                        referer_object: []
                                    },
                                    //不支持DirId,支持ChunkId/FileId
                                    object_id: chunkId.calculate_id(),
                                    local_path: savePath +"\\" + fileName,
                                    device_list: [target.local_device_id()],
                                    auto_start: true
                                })).unwrap()
                                let sleepTime = 50;
                                console.log("create_task_id",JSON.stringify(create_task.task_id))
                            
                                //5. target 设备 get_task_state 检查下载状态
                                let check: Promise<{ err: boolean, log: string, fileId?: string}> = new Promise(async (v) => {
                                    setTimeout(() => {
                                        console.info(`下载文件超时`)
                                        v({ err: true, log: `下载文件超时：${chunkId.calculate_id()}` })
                                    }, timeout)
                                    while (true) {
                                        console.log(`${savePath}`);
                                        const resp = (await source.trans().get_task_state({
                                            common: {
                                                level: cyfs.NDNAPILevel.NDC,
                                                flags: 0,
                                                dec_id: source.dec_id,
                                                target: source.local_device_id().object_id,
                                                req_path: "",
                                                referer_object: []

                                            },
                                            task_id: create_task.task_id
                                        })).unwrap();
                                        console.log("get task status", JSON.stringify(resp.state));
                                        if (resp.state === cyfs.TransTaskState.Finished) {
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
                                
                                
                                    v({ err: false, log: `下载文件成功：${chunkId.calculate_id()}` })
                                })       
                                //let result = await check;
                                //return result
                            }))}
                            let download = []
                            for (let i in chunkRecvPromise) {
                                let result = await chunkRecvPromise[i]
                            if (result.err) {
                                return { err: result.err, log: result.log }
                            }
                            download.push(result)                        
                            }
                        
                        //清理数据
                        //await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)   
                    })
                    it("#NDN权限测试,objectmap_inner_path,trans_createtask,chunk目标对象,来源对象file",async()=>{
                                               //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1ood.fork_with_new_dec(DecId.DecIdB)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        let savePath = path.join(__dirname, "./chunk_trans/target/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let root_path = "/123/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 10 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                        let res= (await trans_file_for_task(stack,filePath,"\\" + fileName,chunkSize,level))
                        let chunkIdList = res[1]
                        
                        //将file对象id挂在objet_map上
                        let file_id = res[0]
                        console.info("res_file_id",file_id)
                         
                        //从target设备get 对象数据
                        console.log("chunkIdList_length",chunkIdList!.length)
                        let chunkRecvPromise: Array<any> = []
                        for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                            console.log("chunkIdList_i_ ", i)
                            chunkRecvPromise.push(new Promise(async (v) => {
                     
                                let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                                console.info(`开始传输chunk:${chunkId},${buff}`)

                                //将chunkid对象id挂在objet_map上
                                //4. target 设备 start_task 开始下载文件
                                
                                let create_task = (await source.trans().create_task({
                                    common: {
                                        level: cyfs.NDNAPILevel.NDN,
                                        flags: 0,
                                        dec_id: source.dec_id,
                                        target: target.local_device_id().object_id,
                                        //referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)]
                                        referer_object: []
                                    },
                                    //不支持DirId,支持ChunkId/FileId
                                    object_id: chunkId.calculate_id(),
                                    local_path: savePath +"\\" + fileName,
                                    device_list: [target.local_device_id()],
                                    auto_start: true
                                })).unwrap()
                                let sleepTime = 50;
                                console.log("create_task_id",JSON.stringify(create_task.task_id))
                            
                                //5. target 设备 get_task_state 检查下载状态
                                let check: Promise<{ err: boolean, log: string, fileId?: string}> = new Promise(async (v) => {
                                    setTimeout(() => {
                                        console.info(`下载文件超时`)
                                        v({ err: true, log: `下载文件超时：${chunkId.calculate_id()}` })
                                    }, timeout)
                                    while (true) {
                                        console.log(`${savePath}`);
                                        const resp = (await source.trans().get_task_state({
                                            common: {
                                                level: cyfs.NDNAPILevel.NDC,
                                                flags: 0,
                                                dec_id: source.dec_id,
                                                target: source.local_device_id().object_id,
                                                req_path: "",
                                                referer_object: []

                                            },
                                            task_id: create_task.task_id
                                        })).unwrap();
                                        console.log("get task status", JSON.stringify(resp.state));
                                        if (resp.state === cyfs.TransTaskState.Finished) {
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
                                
                                
                                    v({ err: false, log: `下载文件成功：${chunkId.calculate_id()}` })
                                })       
                                //let result = await check;
                                //return result
                            }))}
                            let download = []
                            for (let i in chunkRecvPromise) {
                                let result = await chunkRecvPromise[i]
                            if (result.err) {
                                return { err: result.err, log: result.log }
                            }
                            download.push(result)                        
                            }
                        
                        //清理数据
                        //await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)   
                    })
                    it("#NDN权限测试,objectmap_inner_path,trans_createtask,chunk目标对象,来源对象dir",async()=>{
                                               //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1ood.fork_with_new_dec(DecId.DecIdB)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        let savePath = path.join(__dirname, "./chunk_trans/target/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let root_path = "/123/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 10 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                        let res= (await trans_file_for_task(stack,filePath,"\\" + fileName,chunkSize,level))
                        let chunkIdList = res[1]
                        
                        //将file对象id挂在objet_map上
                        let file_id = res[0]
                        console.info("res_file_id",file_id)
                         
                        //从target设备get 对象数据
                        console.log("chunkIdList_length",chunkIdList!.length)
                        let chunkRecvPromise: Array<any> = []
                        for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                            console.log("chunkIdList_i_ ", i)
                            chunkRecvPromise.push(new Promise(async (v) => {
                     
                                let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                                console.info(`开始传输chunk:${chunkId},${buff}`)

                                //将chunkid对象id挂在objet_map上
                                //4. target 设备 start_task 开始下载文件
                                
                                let create_task = (await source.trans().create_task({
                                    common: {
                                        level: cyfs.NDNAPILevel.NDN,
                                        flags: 0,
                                        dec_id: source.dec_id,
                                        target: target.local_device_id().object_id,
                                        //referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)]
                                        referer_object: []
                                    },
                                    //不支持DirId,支持ChunkId/FileId
                                    object_id: chunkId.calculate_id(),
                                    local_path: savePath +"\\" + fileName,
                                    device_list: [target.local_device_id()],
                                    auto_start: true
                                })).unwrap()
                                let sleepTime = 50;
                                console.log("create_task_id",JSON.stringify(create_task.task_id))
                            
                                //5. target 设备 get_task_state 检查下载状态
                                let check: Promise<{ err: boolean, log: string, fileId?: string}> = new Promise(async (v) => {
                                    setTimeout(() => {
                                        console.info(`下载文件超时`)
                                        v({ err: true, log: `下载文件超时：${chunkId.calculate_id()}` })
                                    }, timeout)
                                    while (true) {
                                        console.log(`${savePath}`);
                                        const resp = (await source.trans().get_task_state({
                                            common: {
                                                level: cyfs.NDNAPILevel.NDC,
                                                flags: 0,
                                                dec_id: source.dec_id,
                                                target: source.local_device_id().object_id,
                                                req_path: "",
                                                referer_object: []

                                            },
                                            task_id: create_task.task_id
                                        })).unwrap();
                                        console.log("get task status", JSON.stringify(resp.state));
                                        if (resp.state === cyfs.TransTaskState.Finished) {
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
                                
                                
                                    v({ err: false, log: `下载文件成功：${chunkId.calculate_id()}` })
                                })       
                                //let result = await check;
                                //return result
                            }))}
                            let download = []
                            for (let i in chunkRecvPromise) {
                                let result = await chunkRecvPromise[i]
                            if (result.err) {
                                return { err: result.err, log: result.log }
                            }
                            download.push(result)                        
                            }
                        
                        //清理数据
                        //await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)   
                    })
                    it("#NDN权限测试,objectmap_inner_path,trans_createtask,chunk目标对象,来源对象objectmap+inner_path",async()=>{
                                               //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1ood.fork_with_new_dec(DecId.DecIdB)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        let savePath = path.join(__dirname, "./chunk_trans/target/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let root_path = "/123/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 10 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                        let res= (await trans_file_for_task(stack,filePath,"\\" + fileName,chunkSize,level))
                        let chunkIdList = res[1]
                        
                        //将file对象id挂在objet_map上
                        let file_id = res[0]
                        console.info("res_file_id",file_id)
                         
                        //从target设备get 对象数据
                        console.log("chunkIdList_length",chunkIdList!.length)
                        let chunkRecvPromise: Array<any> = []
                        for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                            console.log("chunkIdList_i_ ", i)
                            chunkRecvPromise.push(new Promise(async (v) => {
                     
                                let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                                console.info(`开始传输chunk:${chunkId},${buff}`)

                                //将chunkid对象id挂在objet_map上
                                //4. target 设备 start_task 开始下载文件
                                
                                let create_task = (await source.trans().create_task({
                                    common: {
                                        level: cyfs.NDNAPILevel.NDN,
                                        flags: 0,
                                        dec_id: source.dec_id,
                                        target: target.local_device_id().object_id,
                                        //referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)]
                                        referer_object: []
                                    },
                                    //不支持DirId,支持ChunkId/FileId
                                    object_id: chunkId.calculate_id(),
                                    local_path: savePath +"\\" + fileName,
                                    device_list: [target.local_device_id()],
                                    auto_start: true
                                })).unwrap()
                                let sleepTime = 50;
                                console.log("create_task_id",JSON.stringify(create_task.task_id))
                            
                                //5. target 设备 get_task_state 检查下载状态
                                let check: Promise<{ err: boolean, log: string, fileId?: string}> = new Promise(async (v) => {
                                    setTimeout(() => {
                                        console.info(`下载文件超时`)
                                        v({ err: true, log: `下载文件超时：${chunkId.calculate_id()}` })
                                    }, timeout)
                                    while (true) {
                                        console.log(`${savePath}`);
                                        const resp = (await source.trans().get_task_state({
                                            common: {
                                                level: cyfs.NDNAPILevel.NDC,
                                                flags: 0,
                                                dec_id: source.dec_id,
                                                target: source.local_device_id().object_id,
                                                req_path: "",
                                                referer_object: []

                                            },
                                            task_id: create_task.task_id
                                        })).unwrap();
                                        console.log("get task status", JSON.stringify(resp.state));
                                        if (resp.state === cyfs.TransTaskState.Finished) {
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
                                
                                
                                    v({ err: false, log: `下载文件成功：${chunkId.calculate_id()}` })
                                })       
                                //let result = await check;
                                //return result
                            }))}
                            let download = []
                            for (let i in chunkRecvPromise) {
                                let result = await chunkRecvPromise[i]
                            if (result.err) {
                                return { err: result.err, log: result.log }
                            }
                            download.push(result)                        
                            }
                        
                        //清理数据
                        //await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)   
                    })
                    it("#NDN权限测试,objectmap_inner_path,trans_createtask,File目标对象",async()=>{
                                               //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1ood.fork_with_new_dec(DecId.DecIdB)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        let savePath = path.join(__dirname, "./chunk_trans/target/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let root_path = "/123/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 10 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                        let res= (await trans_file_for_task(stack,filePath,"\\" + fileName,chunkSize,level))
                        let chunkIdList = res[1]
                        
                        //将file对象id挂在objet_map上
                        let file_id = res[0]
                        console.info("res_file_id",file_id)
                         
                        //从target设备get 对象数据
                        console.log("chunkIdList_length",chunkIdList!.length)
                        let chunkRecvPromise: Array<any> = []
                        for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                            console.log("chunkIdList_i_ ", i)
                            chunkRecvPromise.push(new Promise(async (v) => {
                     
                                let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                                console.info(`开始传输chunk:${chunkId},${buff}`)

                                //将chunkid对象id挂在objet_map上
                                //4. target 设备 start_task 开始下载文件
                                
                                let create_task = (await source.trans().create_task({
                                    common: {
                                        level: cyfs.NDNAPILevel.NDN,
                                        flags: 0,
                                        dec_id: source.dec_id,
                                        target: target.local_device_id().object_id,
                                        //referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)]
                                        referer_object: []
                                    },
                                    //不支持DirId,支持ChunkId/FileId
                                    object_id: chunkId.calculate_id(),
                                    local_path: savePath +"\\" + fileName,
                                    device_list: [target.local_device_id()],
                                    auto_start: true
                                })).unwrap()
                                let sleepTime = 50;
                                console.log("create_task_id",JSON.stringify(create_task.task_id))
                            
                                //5. target 设备 get_task_state 检查下载状态
                                let check: Promise<{ err: boolean, log: string, fileId?: string}> = new Promise(async (v) => {
                                    setTimeout(() => {
                                        console.info(`下载文件超时`)
                                        v({ err: true, log: `下载文件超时：${chunkId.calculate_id()}` })
                                    }, timeout)
                                    while (true) {
                                        console.log(`${savePath}`);
                                        const resp = (await source.trans().get_task_state({
                                            common: {
                                                level: cyfs.NDNAPILevel.NDC,
                                                flags: 0,
                                                dec_id: source.dec_id,
                                                target: source.local_device_id().object_id,
                                                req_path: "",
                                                referer_object: []

                                            },
                                            task_id: create_task.task_id
                                        })).unwrap();
                                        console.log("get task status", JSON.stringify(resp.state));
                                        if (resp.state === cyfs.TransTaskState.Finished) {
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
                                
                                
                                    v({ err: false, log: `下载文件成功：${chunkId.calculate_id()}` })
                                })       
                                //let result = await check;
                                //return result
                            }))}
                            let download = []
                            for (let i in chunkRecvPromise) {
                                let result = await chunkRecvPromise[i]
                            if (result.err) {
                                return { err: result.err, log: result.log }
                            }
                            download.push(result)                        
                            }
                        
                        //清理数据
                        //await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)   
                    })
                    it("#NDN权限测试,objectmap_inner_path,trans_createtask,File目标对象,来源对象objectmap_inner_path",async()=>{
                                               //stack
                        let source = zone1ood.fork_with_new_dec(DecId.DecIdA)
                        let target = zone1ood.fork_with_new_dec(DecId.DecIdB)

                        //test conf
                        let fileName = RandomGenerator.string(10);
                        let filePath = path.join(__dirname, "./chunk_trans/source/")
                        let savePath = path.join(__dirname, "./chunk_trans/target/")
                        console.log("filePath",filePath)
                        let chunkSize = 4 * 1024 * 1024
                        let chunkNumber = 10
                        let timeout: number = 600 * 1000                
                        let acl_path = "/test/api/test/"
                        let root_path = "/123/test/"
                        let decid = target.dec_id

                        //create test file
                        await RandomGenerator.createRandomFile(filePath, fileName, 10 * 1024 * 1024);

                        //acl
                        await source.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).clear_access()
                        await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))
                        await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(acl_path,acc))

                        //rmeta
                        let stub_source = source.root_state_stub(undefined,undefined)
                        let stub_target = target.root_state_stub(undefined,undefined)

                        let env_acc:cyfs.RootStateOpEnvAccess = {
                        path:acl_path,
                        access:cyfs.AccessPermissions.Full 
                        }
    
                        //vaildate
                        let path_handler = new cyfs.RequestGlobalStatePath(decid, acl_path).toString()

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                        let stack = [source,source,source,source,source,source,source,source,source,source]
                        let level = [cyfs.NDNAPILevel.NDC,cyfs.NONAPILevel.NOC,cyfs.NONAPILevel.NON]
                        let res= (await trans_file_for_task(stack,filePath,"\\" + fileName,chunkSize,level))
                        let chunkIdList = res[1]
                        
                        //将file对象id挂在objet_map上
                        let file_id = res[0]
                        console.info("res_file_id",file_id)
                         
                        //从target设备get 对象数据
                        console.log("chunkIdList_length",chunkIdList!.length)
                        let chunkRecvPromise: Array<any> = []
                        for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                            console.log("chunkIdList_i_ ", i)
                            chunkRecvPromise.push(new Promise(async (v) => {
                     
                                let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                                console.info(`开始传输chunk:${chunkId},${buff}`)

                                //将chunkid对象id挂在objet_map上
                                //4. target 设备 start_task 开始下载文件
                                
                                let create_task = (await source.trans().create_task({
                                    common: {
                                        level: cyfs.NDNAPILevel.NDN,
                                        flags: 0,
                                        dec_id: source.dec_id,
                                        target: target.local_device_id().object_id,
                                        //referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)]
                                        referer_object: []
                                    },
                                    //不支持DirId,支持ChunkId/FileId
                                    object_id: chunkId.calculate_id(),
                                    local_path: savePath +"\\" + fileName,
                                    device_list: [target.local_device_id()],
                                    auto_start: true
                                })).unwrap()
                                let sleepTime = 50;
                                console.log("create_task_id",JSON.stringify(create_task.task_id))
                            
                                //5. target 设备 get_task_state 检查下载状态
                                let check: Promise<{ err: boolean, log: string, fileId?: string}> = new Promise(async (v) => {
                                    setTimeout(() => {
                                        console.info(`下载文件超时`)
                                        v({ err: true, log: `下载文件超时：${chunkId.calculate_id()}` })
                                    }, timeout)
                                    while (true) {
                                        console.log(`${savePath}`);
                                        const resp = (await source.trans().get_task_state({
                                            common: {
                                                level: cyfs.NDNAPILevel.NDC,
                                                flags: 0,
                                                dec_id: source.dec_id,
                                                target: source.local_device_id().object_id,
                                                req_path: "",
                                                referer_object: []

                                            },
                                            task_id: create_task.task_id
                                        })).unwrap();
                                        console.log("get task status", JSON.stringify(resp.state));
                                        if (resp.state === cyfs.TransTaskState.Finished) {
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
                                
                                
                                    v({ err: false, log: `下载文件成功：${chunkId.calculate_id()}` })
                                })       
                                //let result = await check;
                                //return result
                            }))}
                            let download = []
                            for (let i in chunkRecvPromise) {
                                let result = await chunkRecvPromise[i]
                            if (result.err) {
                                return { err: result.err, log: result.log }
                            }
                            download.push(result)                        
                            }
                        
                        //清理数据
                        //await clean_test_data(source,target,res[1],acl_path,filePath+ "/" + fileName)   
                    })
                })
            })
           })
        })
        })
    })
})

