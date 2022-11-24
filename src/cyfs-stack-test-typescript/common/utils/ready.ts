import assert from 'assert';
import * as cyfs from "../../cyfs_node/cyfs_node"
import { RandomGenerator } from "./generator";
import * as fs from "fs-extra";
import * as path from "path";


export class Ready{

static async addDir(source: cyfs.SharedCyfsStack, target: cyfs.SharedCyfsStack, fileSize: number, chunkSize: number, level: cyfs.NDNAPILevel, mount?: string, control_object?: string, access?: cyfs.AccessString, putdata?: string) {
    let saveDir = path.join(__dirname, "../../test_cache_file")
    let inner_path = "/file-NDN.txt"

    let local_path = path.join(saveDir, inner_path)
    console.log(`_______>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>${local_path}`)
    if (fs.pathExistsSync(local_path)) {
        await fs.removeSync(local_path)
    }
    //(2)生成测试文件
    //RandomGenerator.createRandomDir(__dirname,1,1,fileSize)
    await RandomGenerator.createRandomFile(saveDir, inner_path, fileSize);

    //1. source 设备 publish_file 将dir存放到本地NDC  
    let owner = source.local_device().desc().owner()!.unwrap()
    let publish_file_time = Date.now();
    const pubres = (await source.trans().publish_file({
        common: {
            level: level,
            flags: 0,
            dec_id: source.dec_id,
            target: target.local_device_id().object_id,
            req_path: undefined,
            referer_object: []
        },
        owner,
        local_path: saveDir,
        chunk_size: chunkSize,     // chunk大小4M
        dirs: []
    }));
    publish_file_time = Date.now() - publish_file_time;
    console.info(`addDir publish_file 耗时：${publish_file_time}`)
    assert(!pubres.err, `publish_file 失败`)

    let pub_resp: cyfs.TransAddFileResponse = pubres.unwrap();

    let object_map_id = cyfs.ObjectMapId.try_from_object_id(pub_resp.file_id).unwrap()

    //2. source 设备根据objectmap获取fileid和chunkid
    let file_id_from_objectmap
    let chunkIdList
    {
        const getoreq = {
            common: {
                level: cyfs.NONAPILevel.NOC,
                flags: 0,
                target: target.local_device_id().object_id
            },
            object_id: object_map_id.object_id,
            inner_path: inner_path
        };
        let getores = await source.non_service().get_object(getoreq)
        assert(!getores.err, `get_object 获取dir对象失败`)

        let get_resp: cyfs.NONGetObjectOutputResponse = getores.unwrap();

        //file_id_from_objectmap = cyfs.FileId.try_from_object_id(get_resp.object.object_id).unwrap()
        const [file, buf] = new cyfs.FileDecoder().raw_decode(get_resp.object.object_raw).unwrap();
        chunkIdList = file.body_expect().content().inner_chunk_list()
    }

    //根据objectmap 获取dirid
    let dresp
    {
        let req: cyfs.UtilBuildDirFromObjectMapOutputRequest = {
            common: {
                flags: 0
            },
            object_map_id: object_map_id.object_id,
            dir_type: cyfs.BuildDirType.Zip
        };
        let resp = await source.util().build_dir_from_object_map(req)
        dresp = resp.unwrap()
    }
    let dir_id: cyfs.DirId = cyfs.DirId.try_from_object_id(dresp.object_id).unwrap()
    //获取dir对象
    let respd: cyfs.NONGetObjectOutputResponse
    {
        const getoreq = {
            common: {
                level: cyfs.NONAPILevel.NOC,
                flags: 0,
                target: target.local_device_id().object_id
            },
            object_id: dir_id.object_id,
            inner_path: undefined
        };
        let getores = await source.non_service().get_object(getoreq)
        assert(!getores.err, `get_object 获取dir对象失败`)
        respd = getores.unwrap();
    }
    //根据dir_id 获取fileid
    let respf: cyfs.NONGetObjectOutputResponse
    {
        const getoreq = {
            common: {
                level: cyfs.NONAPILevel.NOC,
                flags: 0,
                target: target.local_device_id().object_id
            },
            object_id: dir_id.object_id,
            inner_path: inner_path
        };
        let getores = await source.non_service().get_object(getoreq)
        assert(!getores.err, `get_object 获取dir对象失败`)
        respf = getores.unwrap();

    }

    let file_id: cyfs.FileId = cyfs.FileId.try_from_object_id(respf.object.object_id).unwrap()
    console.info(`————————————————————————————————————>file ${file_id} >dir ${dir_id} >innerpath ${inner_path} >chunkidList ${chunkIdList}`)


    let req_path: string = "no need"
    if (mount) {
        //注册req_path
        let mount_value: cyfs.ObjectId
        if (mount == "mount-dir") { mount_value = dir_id.object_id; }
        else if (mount == "mount-chunk") { mount_value = chunkIdList![0].calculate_id() } else if (mount == "mount-file") { mount_value = file_id.object_id } else { console.error("--------------> mount param must be mount-dir|mount-chunk|mount-file ") }

        let reqpath = "/test_nDn"
        let stub = source.root_state_stub(source.local_device_id().object_id, source.dec_id);
        let op_env = (await stub.create_path_op_env()).unwrap()
        console.log(`___________+===============mountvalue: ${mount_value!}`)
        await op_env.set_with_path(reqpath, mount_value!, undefined, true)
        let o = (await op_env.commit()).unwrap()

        req_path = new cyfs.RequestGlobalStatePath(target.dec_id, reqpath).toString()
        console.log("------------------------> " + req_path)
    }
    if (access && control_object) {
        // source 设备 将dir map对象put 到 targrt 设备
        let type: cyfs.NONObjectInfo
        switch (control_object) {
            case "chunk":
                //获取chunk对象
                let rep2: cyfs.NDNGetDataOutputRequest = {
                    common: {
                        // api级别
                        level: cyfs.NDNAPILevel.Router,
                        // targrt设备参数
                        target: target.local_device_id().object_id,
                        // 需要处理数据的关联对象，主要用以chunk/file等
                        referer_object: [],
                        flags: 1,
                    },
                    object_id: chunkIdList![0].calculate_id()
                }
                //调用接口
                let resp = await source.ndn_service().get_data(rep2);
                assert(!resp.err, `get_data 传输chunk失败`)
                let respc = resp.unwrap()
                type = new cyfs.NONObjectInfo(respc.object_id, respc.data)
            case "file":
                type = respf.object;
                break
            case "dir":
                type = respd.object
            default: console.warn("暂不支持其他类型")

        }
        await source.non_service().put_object({
            common: {
                level: cyfs.NONAPILevel.Router,
                target: target.local_device_id().object_id,
                flags: 0
            },
            object: type!,
            access: access
        })
    }
    // if (putdata) {
    //     // let type: cyfs.FileId | cyfs.DirId
    //     // if (putdata == "file") { type = file_id } else if (putdata == "dir") { type = dir_id } else { console.error("input error type parmas must be file|dir") }
    //     // let task = await source.trans().create_task({
    //     //     common: {
    //     //         req_path: req_path,
    //     //         dec_id: source.dec_id,
    //     //         level: cyfs.NDNAPILevel.Router,
    //     //         target: target.local_device_id().object_id,
    //     //         referer_object: [],
    //     //         flags: 1,
    //     //     },
    //     //     object_id: pub_resp.file_id,
    //     //     local_path: local_path,
    //     //     device_list: [source.local_device_id()],
    //     //     auto_start: true,
    //     // })
    //     // await source.trans().start_task( {
    //     //     common:  {
    //     //         req_path: req_path,
    //     //         dec_id: source.dec_id,
    //     //         level: cyfs.NDNAPILevel.Router,
    //     //         target : target.local_device_id().object_id,
    //     //         referer_object: [],
    //     //         flags: 1,
    //     //     },
    //     //     task_id : task.unwrap().task_id
    //     // })
    //     // console.info(JSON.stringify(task));
    //     // assert.ok(!task.err,"start_task 失败");

    //     let rep: cyfs.NDNPutDataOutputRequest = {
    //         common: {
    //             // 请求路径，可为空
    //             req_path: req_path,
    //             // 来源DEC
    //             dec_id: undefined,
    //             // api级别
    //             level: cyfs.NDNAPILevel.Router,
    //             // targrt设备参数目前无用
    //             target: target.local_device_id().object_id,
    //             // 需要处理数据的关联对象，主要用以chunk/file等
    //             referer_object: [],
    //             flags: 1,
    //         },
    //         object_id: chunkIdList![0].calculate_id(),
    //         length: respc.data.length,
    //         data: respc.data,
    //     }
    //     //调用接口
    //     let resp = await source.ndn_service().put_data(rep);
    //     console.info(`${resp}`)
    //     assert(!resp.err, `put_data 传输对象失败`)
    // }
    return { file_id, dir_id, inner_path, chunkIdList, req_path }
}
}