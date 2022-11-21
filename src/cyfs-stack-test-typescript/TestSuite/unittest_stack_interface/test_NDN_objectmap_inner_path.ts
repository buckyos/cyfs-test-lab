import * as fs from "fs-extra";
import assert = require('assert');
import * as cyfs from '../../cyfs_node/cyfs_node'
import { ZoneSimulator, stringToUint8Array, RandomGenerator, stackInfo } from "../../common";
import * as path from 'path';
import * as gen_Dir from "../../common/utils/generator"

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
acc.set_group_permissions(cyfs.AccessGroup.OthersZone,cyfs.AccessPermissions.Full)
acc.set_group_permissions(cyfs.AccessGroup.OthersDec,cyfs.AccessPermissions.Full)
acc.set_group_permissions(cyfs.AccessGroup.CurrentDevice,cyfs.AccessPermissions.Full)
acc.set_group_permissions(cyfs.AccessGroup.CurrentZone,cyfs.AccessPermissions.Full)


/*----------------------------------------------------------------------------------------------------------------------------------------------------------*/

async function trans_chunk_for_getdata(source: cyfs.SharedCyfsStack, target: cyfs.SharedCyfsStack, filePath: string,inner_path:string, chunkSize: number, nonlevel:cyfs.NONAPILevel):Promise<any>{
    console.info('开始chunk')
    console.info("filePat",filePath)
    console.info("inner_path",inner_path)

    //1. source 设备 publish_file 将文件存放到本地NDC 
    let owner = source.local_device().desc().owner()!.unwrap()
    const file_resp_0 = (await source.trans().publish_file({
        common: {
            level: cyfs.NDNAPILevel.NDC,
            flags: 0,
            dec_id: source.dec_id,
            referer_object: []

        },
        owner:owner,
        local_path: filePath,
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
    const file_obj_resp_0 = (await source.non_service().get_object({
        common: {
            level: cyfs.NONAPILevel.NOC,
            flags: 0,
            
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
    let dir_from = await source.util().build_dir_from_object_map({
        common: {flags: 0},
        object_map_id:object_map_id.object_id.clone(),
        dir_type: cyfs.BuildDirType.Zip,
    })

    let dir_id = cyfs.DirId.try_from_object_id(dir_from.unwrap().object_id).unwrap()
    console.info("dir_id: ",dir_id)


    //4. source 设备 将文件对象put 到 targrt 设备
    const file_obj_resp: cyfs.NONGetObjectOutputResponse = file_obj_resp_0.unwrap();
    let put_file_object = (await source.non_service().put_object({
        common: {
            level: nonlevel,
            target: target.local_device_id().object_id,
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
async function trans_file_for_task(source: cyfs.SharedCyfsStack, target: cyfs.SharedCyfsStack, filePath: string, chunkSize: number, savePath: string, level: cyfs.NDNAPILevel, timeout: number = 600 * 1000): Promise<{ err: boolean, log: string, time?: number, fileId?: string, totalTime?: number }> {
    //1. source 设备 publish_file 将文件存放到本地NDC 
    let totalTime = 0;
    let begin = Date.now();
    let owner = source.local_device().desc().owner()!.unwrap()
    const file_resp_0 = (await source.trans().publish_file({
        common: {
            level: cyfs.NDNAPILevel.NDC,
            flags: 0,
            dec_id: source.dec_id,
            req_path: "",
            referer_object: []

        },
        owner,
        local_path: filePath,
        chunk_size: chunkSize,     // chunk大小4M
        dirs: []
    }));
    if (file_resp_0.err) {
        return { err: file_resp_0.err, log: `transFile trans publish_file failed` }
    }
    let file_resp: cyfs.TransAddFileResponse = file_resp_0.unwrap();

    //assert(file_resp.file_id)

    //2. source 设备 使用NOC 获取文件对象
    const file_obj_resp_0 = (await source.non_service().get_object({
        common: {
            level: cyfs.NONAPILevel.NOC,
            flags: 0
        },
        object_id: file_resp.file_id
    }));
    if (file_obj_resp_0.err) {
        return { err: file_obj_resp_0.err, log: `transFile non_service get_object failed` }
    }
    let file_obj_resp: cyfs.NONGetObjectOutputResponse = file_obj_resp_0.unwrap();
    //3. source 设备 将文件对象put 到 targrt 设备
    let put_object_resp = await source.non_service().put_object({
        common: {
            level: cyfs.NONAPILevel.Router,
            target: target.local_device_id().object_id,
            flags: 0
        },
        object: file_obj_resp.object
    });
    if (put_object_resp.err) {
        return { err: file_obj_resp_0.err, log: `transFile non_service put file object failed` }
    }

    //4. target 设备 start_task 开始下载文件
    let time = 0;
    let start = Date.now();
    let create_task = (await target.trans().create_task({
        common: {
            level: level,
            flags: 0,
            dec_id: ZoneSimulator.APPID,
            target: target.local_device_id().object_id,
            referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)]
        },
        object_id: file_resp.file_id,
        local_path: savePath,
        device_list: [source.local_device_id()],
        auto_start: true
    })).unwrap()
    let sleepTime = 50;
    //5. target 设备 get_task_state 检查下载状态
    let check: Promise<{ err: boolean, log: string, time?: number, fileId?: string, totalTime?: number }> = new Promise(async (v) => {
        setTimeout(() => {
            console.info(`下载文件超时`)
            v({ err: true, log: `下载文件超时：${file_resp.file_id.to_base_58()}` })
        }, timeout)
        while (true) {
            console.log(`${savePath}`);
            const resp = (await source.trans().get_task_state({
                common: {
                    level: level,
                    flags: 0,
                    dec_id: ZoneSimulator.APPID,
                    target: target.local_device_id().object_id,
                    req_path: "",
                    referer_object: []

                },
                task_id: create_task.task_id
            })).unwrap();
            console.log("get task status", resp.state);
            if (resp.state === cyfs.TransTaskState.Finished) {
                time = Date.now() - start;
                totalTime = Date.now() - begin;
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
        v({ err: false, time: time, totalTime: totalTime, log: `下载文件成功：${file_resp.file_id.to_base_58()}` })
    })
    let result = await check;
    return result;
}
async function trans_dir_for_task(source: cyfs.SharedCyfsStack, target: cyfs.SharedCyfsStack, dirPath: string, chunkSize: number, savePath: string, level: cyfs.NDNAPILevel, timeout: number = 600 * 1000) {
    //判断输入参数是否正确
    if (!fs.pathExistsSync(dirPath)) {
        return { err: true, log: `下载文件夹不存在` }
    }
    if (!fs.pathExistsSync(savePath)) {
        return { err: true, log: `存放目录不存在` }
    }

    //1. source 设备 publish_file 将dir存放到本地NDC  
    let owner = source.local_device().desc().owner()!.unwrap()


    const publish_file_resp = (await source.trans().publish_file({
        common: {
            level: cyfs.NDNAPILevel.NDC,
            flags: 0,
            dec_id: source.dec_id,
            req_path: undefined,
            referer_object: []

        },
        owner:owner,
        local_path: dirPath,
        chunk_size: chunkSize,     // chunk大小4M
        file_id: undefined,
        dirs: []
    }));
    console.info(publish_file_resp)
    if (publish_file_resp.err) {
        return { err: true, log: `transDir publish_file failed ` }
    }


    console.log("#publish_file_resp",JSON.stringify(publish_file_resp))

    let object_map_id = cyfs.ObjectMapId.try_from_object_id(publish_file_resp.unwrap().file_id).unwrap()

    console.log("#object_map_id",JSON.stringify(object_map_id))

    //2. source 设备 使用NOC 获取dir map
    const get_object_resp_0 = (await source.non_service().get_object({
        common: {
            level: cyfs.NONAPILevel.NOC,
            flags: 0
        },
        //object_id: publish_file_info.file_id
        object_id:object_map_id.object_id.clone(),
        inner_path:"/11111.txt"
    }));
    if (get_object_resp_0.err) {
        return { err: true, log: `transDir non_service get_object failed ` }
    }

    console.info("#get_object_resp_0", JSON.stringify(get_object_resp_0))

    let dir_map = get_object_resp_0.unwrap().object;
    
    console.info("#dir_map_source", JSON.stringify(dir_map))

    //从dir map 获取dir 对象
    let dir_from = await source.util().build_dir_from_object_map({
        common: {flags: 0},
        object_map_id:object_map_id.object_id.clone(),
        dir_type: cyfs.BuildDirType.Zip,
    })
    let dir_id = cyfs.DirId.try_from_object_id(dir_from.unwrap().object_id).unwrap()

    console.info(`#transDir build_dir_from_object_map dir_id ; ${dir_id}`)

    const dir_obj_resp_1 = (await source.non_service().get_object({
        common: {
            level: cyfs.NONAPILevel.NOC,
            flags: 0
        },
        object_id: dir_id.object_id
    }));
    if (dir_obj_resp_1.err) {
        return { err: true, log: `transDir non_service get_object failed ` }
    }
    let dir_obj = dir_obj_resp_1.unwrap()
    console.info(`dir 对象：${dir_obj.object.object_id} ${dir_obj.object.object?.obj_type()} ${dir_obj.object.object?.obj_type_code()}`)
    const [dir_source] = new cyfs.DirDecoder().raw_decode(dir_obj.object.object_raw).unwrap();
    dir_source.body_expect().content().match({
        Chunk: (chunk) => {
            console.info(`#source dir object chunk ${JSON.stringify(chunk)}`)
        },
        ObjList: (list) => {
            console.info(`#source dir object body ObjList ${JSON.stringify(list.entries())}`)
        }
    })
    //console.info(`# source dir object desc ObjList ${JSON.stringify(dir_source.desc().content().obj_list())}`)
    dir_source.desc().content().obj_list().match({
        Chunk: (chunk) => {
            console.info(`#source dir object desc chunk ${JSON.stringify(chunk)}`)
        },
        ObjList: (list) => {
            console.info(`#source dir object desc ObjList ${JSON.stringify(list.object_map().entries())}`)
        }
    })

    // source 设备 将dir map对象put 到 targrt 设备
    let put_object_time = Date.now();
    let put_map_resp = (await source.non_service().put_object({
        common: {
            level: cyfs.NONAPILevel.Router,
            target: target.local_device_id().object_id,
            flags: 0
        },
        object: dir_map
    }))

    if (put_map_resp.err) {
        return { err: true, log: `transDir non_service put_map_resp failed ` }
    }
    // source 设备 将dir对象put 到 targrt 设备
    let put_object_resp = (await source.non_service().put_object({
        common: {
            level: cyfs.NONAPILevel.Router,
            target: target.local_device_id().object_id,
            flags: 0
        },
        object: dir_obj.object
    }))

    if (put_object_resp.err) {
        return { err: true, log: `transDir non_service put_object_resp failed ` }
    }
    //4. target 设备 本地重构dir对象文件目录结构，获取下载文件任务列表


    //let [dir_map,dir_map_raw] = new cyfs.ObjectMapDecoder().raw_decode(dir_obj_resp.object.object_raw).unwrap();
    const dir_obj_resp = (await target.non_service().get_object({
        common: {
            level: cyfs.NONAPILevel.NOC,
            flags: 0
        },
        object_id: dir_obj.object.object_id
    }));
    if (dir_obj_resp_1.err) {
        return { err: true, log: `transDir non_service get_object failed ` }
    }
    let dir_obj_target = dir_obj_resp.unwrap();
    console.info(`#transDir target dir_id; ${dir_obj_target.object.object_id}`)
    const [dir, _] = new cyfs.DirDecoder().raw_decode(dir_obj_target.object.object_raw).unwrap();

    const dir_map_resp = (await target.non_service().get_object({
        common: {
            level: cyfs.NONAPILevel.NOC,
            flags: 0
        },
        object_id: publish_file_resp.unwrap().file_id
    }));
    if (dir_map_resp.err) {
        return { err: true, log: `transDir non_service get_object failed ` }
    }
    let dir_map_info = dir_map_resp.unwrap();
    console.info(`#transDir target dir_map; ${dir_map_info.object.object_id}`)

    let dir_map_target = new cyfs.ObjectMapDecoder().raw_decode(dir_map_info.object.object_raw).unwrap();
    console.info(JSON.stringify(dir_map_target.entries()))

    let root: TreeNode = {
        type: 'dir',
        subs: new Map(),
    };
    let taskList: Array<FileTransTask> = []
    //let objectList = dir.get_data_from_body()
    dir.body_expect().content().match({
        Chunk: (chunk_id: cyfs.ChunkId) => {
            console.error(`obj_list in chunk not support yet! ${chunk_id}`);
        },
        ObjList: async (obj_list) => {
            console.info(`obj_list : ${JSON.stringify(obj_list)}`)
            for (const [obj_id, obj_buff] of obj_list.entries()) {
                let filePath = savePath;
                console.info(`node : ${obj_id} ${obj_buff}`)
                const file_obj_resp = (await source.non_service().get_object({
                    common: {
                        level: cyfs.NONAPILevel.NOC,
                        flags: 0
                    },

                    object_id: obj_id
                })).unwrap();
                await source.non_service().put_object({
                    common: {
                        level: cyfs.NONAPILevel.Router,
                        target: target.local_device_id().object_id,
                        flags: 0
                    },
                    object: file_obj_resp.object
                });

            }
        }
    });
    let sendObjectPromise: any = new Promise(async (v) => {
        dir.desc().content().obj_list().match({
            Chunk: (chunk_id: cyfs.ChunkId) => {
                console.error(`obj_list in chunk not support yet! ${chunk_id}`);
            },
            ObjList: async (obj_list) => {
                console.info(`obj_list : ${JSON.stringify(obj_list)}`)
                for (const [inner_path, info] of obj_list.object_map().entries()) {
                    let filePath = savePath;
                    const segs = inner_path.value().split('/');
                    console.assert(segs.length > 0);
                    console.info(`###文件节点信息：${inner_path},${info.node().object_id()}`)
                    // source 设备将文件对象发送到target
                    const file_obj_resp = (await source.non_service().get_object({
                        common: {
                            level: cyfs.NONAPILevel.NOC,
                            flags: 0
                        },

                        object_id: info.node()!.object_id()!
                    })).unwrap();
                    let get_file = await source.non_service().put_object({
                        common: {
                            level: cyfs.NONAPILevel.Router,
                            target: target.local_device_id().object_id,
                            flags: 0
                        },
                        object: file_obj_resp.object
                    });
                    if (get_file.err) {
                        console.error(`${info.node().object_id()} put object failed ,err=${JSON.stringify(get_file)}`)
                    }
                    // 一个叶子节点就是一个object_id，可能是FileObj，也可能是DirObj
                    const leaf_node: TreeNode = {
                        name: segs.pop(),
                        type: 'object',
                        object_id: info.node().object_id()!,
                    };
                    let cur = root.subs!;
                    for (const seg of segs) {
                        filePath = path.join(filePath, seg)
                        if (!cur.get(seg)) {
                            const sub_node: TreeNode = {
                                name: seg,
                                type: 'dir',
                                subs: new Map(),
                            };
                            console.info(`添加叶子节点dir：${seg} ${sub_node}`)
                            cur!.set(seg, sub_node);
                            if (!fs.pathExistsSync(filePath)) {
                                fs.mkdirpSync(filePath)
                                console.info(`创建文件夹${filePath}`)
                            }

                        }
                        cur = cur.get(seg)!.subs!;
                    }
                    filePath = path.join(filePath, leaf_node.name!)
                    cur.set(leaf_node.name!, leaf_node);
                    console.info(`添加叶子节点object：${leaf_node.name!} ${leaf_node}`)
                    taskList.push({
                        fileName: leaf_node.name!,
                        object_id: info.node()!.object_id()!,
                        savePath: filePath,
                        state: 0
                    })
                }
                v("run success")
            }
        })

    })
    await sendObjectPromise;
    put_object_time = Date.now() - put_object_time;
    console.info(`transDir put dir object 耗时：${put_object_time}`)
    console.info(`taskList : ${JSON.stringify(taskList)}`)
    let time = Date.now();
    let taskPromise: Array<any> = []
    for (let i in taskList) {
        taskPromise.push(new Promise(async (v) => {
            setTimeout(() => {
                console.info(`${taskList[i].object_id} 下载超时`)
                v({ err: true, log: "下载超时" })
            }, timeout)
            const file_obj_resp = (await target.non_service().get_object({
                common: {
                    level: cyfs.NONAPILevel.NOC,
                    flags: 0
                },
                object_id: taskList[i].object_id
            }));
            if (file_obj_resp.err) {
                console.info(`transDir non_service get_object failed ${taskList[i].object_id} `)
            }
            //5. target 设备 start_task 开始下载文件
            let create_task_resp = await target.trans().create_task({
                common: {
                    level: level,
                    dec_id: source.dec_id,
                    flags: 0,
                    referer_object: [new cyfs.NDNDataRefererObject(undefined,dir_obj_target.object.object_id)]
                },
                object_id: taskList[i].object_id,
                local_path: taskList[i].savePath,
                device_list: [source.local_device_id()],
                auto_start: true
            })
            let task_id = create_task_resp.unwrap().task_id;
            console.info(`创建下载文件任务 ：${taskList[i].object_id} task: ${task_id}`)
            //6. target 设备 get_task_state 检查下载状态
            while (true) {
                console.info(`${taskList[i].object_id} 检查下载完成状态 ${taskList[i].savePath}`)
                let resp = (await target.trans().get_task_state({
                    common: {
                        level: level,
                        flags: 0,
                        dec_id: source.dec_id,
                        target: target.local_device_id().object_id,
                        req_path: "",
                        referer_object: []

                    },
                    task_id: task_id
                })).unwrap();

                console.log(`${taskList[i].object_id} get task status`, resp.state);
                taskList[i].state = resp.state
                if (resp.state === cyfs.TransTaskState.Finished) {
                    console.log("download task finished")
                    break;
                }
                await cyfs.sleep(2000);
            }
            v({ err: false, log: "download task finished" })
        }))
    }
    // 等待所有测试任务完成
    for (let i in taskPromise) {
        let result = await taskPromise[i]
        if (result.err) {
            return { err: result.err, taskList, log: result.log }
        }
    }
    time = Date.now() - time;
    console.info(`transDir 下载dir 所有文件总耗时：${time}`)
    return { err: false, taskList, time, log: "下载dir成功" }

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
                describe.only("#NDN权限测试,objectmap_inner_path,getdata",async()=>{
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

                        let op_env_stub_source =  (await stub_source.create_path_op_env_with_access(env_acc)).unwrap()
                        let op_env_stub_target = (await stub_target.create_path_op_env_with_access(env_acc)).unwrap()
                        
                        //初始化数据
                         let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
                           let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
                          let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
                         let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
                        let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
                        let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
                        let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
                         let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
                           let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
                          let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
                         let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
                        let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
                        let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
                        let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
                         let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
                           let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
                          let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
                         let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
                        let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
                        let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
                        let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
                         let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
                           let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
                          let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
                         let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
                        let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
                        let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
                        let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
                         let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
                           let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
                          let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
                         let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
                        let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
                        let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
                        let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
                             let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
                               let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
                              let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
                             let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
                            let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
                            let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
                            let res= (await trans_chunk_for_getdata(source,target,filePath,"/" + fileName,chunkSize,cyfs.NONAPILevel.NON))
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
        })
        })
    })
})
