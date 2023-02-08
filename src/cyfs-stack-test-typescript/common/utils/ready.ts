import assert from 'assert';
import * as cyfs from '../../cyfs_node';
import { RandomGenerator } from "./generator";
import * as fs from "fs-extra";
import * as path from "path";


export enum chunk_mode {
    descChunk = "descChunk",
    bodyChunk = "bodyChunk"
}


export class Ready {

    static async addDir(source: cyfs.SharedCyfsStack, target: cyfs.SharedCyfsStack, fileSize: number, chunkSize: number, level: cyfs.NDNAPILevel, mount?: string, control_object?: string, access?: cyfs.AccessString, putdata?: string, mixchar?: boolean) {

        let saveDir = path.join(__dirname, "../../test_cache_file/file-NDN")
        let inner_path = `/file-${RandomGenerator.string(3, 3, 3)}.txt`
        //if (mixchar){inner_path=`/file-${RandomGenerator.string(3,3,3)}.txt`}
        let local_path = path.join(saveDir, inner_path)
        console.log(`_______>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>${local_path}`)
        { //清理缓存文件
            let num = fs.readdirSync(saveDir).length
            if (num > 5) {
                await fs.removeSync(saveDir)
                console.log("-----------------------> 缓存文件已超过最大数，执行清理操作成功！")
            }
        }
        //(2)生成测试文件
        //RandomGenerator.createRandomDir(__dirname,1,1,fileSize)
        await RandomGenerator.createRandomFile(saveDir, inner_path, fileSize);

        //1. source 设备 publish_file 将dir存放到本地NDC  
        let owner = source.local_device().desc().owner()!
        let publish_file_time = Date.now();
        const pubres = (await source.trans().publish_file({
            common: {
                level: level,
                flags: 0,
                dec_id: source.dec_id,
                //target: target.local_device_id().object_id,
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

        let pub_resp = pubres.unwrap();

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
                    type = new cyfs.NONObjectInfo(respc.object_id, respc.data!)
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
        return { file_id, dir_id, inner_path, chunkIdList, req_path }
    }
    static async chunkMode(mode: chunk_mode, source: cyfs.SharedCyfsStack, target: cyfs.SharedCyfsStack, mount?: String, access?: cyfs.AccessString) {

        let inner_node: cyfs.InnerNodeInfo = new cyfs.InnerNodeInfo(new cyfs.Attributes(0), new cyfs.InnerNode({ object_id: cyfs.ObjectId.default() }))
        let object_map: cyfs.BuckyHashMap<cyfs.BuckyString, cyfs.InnerNodeInfo> = new cyfs.BuckyHashMap()
        object_map.set(new cyfs.BuckyString("path1"), inner_node)
        let list: cyfs.NDNObjectList = new cyfs.NDNObjectList(undefined, object_map)
        let attr: cyfs.Attributes = new cyfs.Attributes(0xFFFF)

        // // 第一种情况，构造一个普通大小的dir，内容可以放到desc里面
        // let builder = new cyfs.DirBuilder(new cyfs.DirDescContent(attr, new cyfs.NDNObjectInfo({ obj_list: list })), new cyfs.DirBodyContent({ obj_list: new cyfs.BuckyHashMap() }));
        // let dir: cyfs.NamedObject<cyfs.DirDescContent, cyfs.DirBodyContent> = builder.no_create_time().update_time(cyfs.JSBI.BigInt(0)).build(cyfs.Dir)
        // let dir_id: cyfs.ObjectId = dir.desc().calculate_id()
        // console.log(`-----------> dir_id = ${dir_id}`)
        // let buf: Uint8Array = dir.to_vec().unwrap()
        // let hash: cyfs.HashValue = cyfs.HashValue.hash_data(buf)
        let data = cyfs.to_vec(list).unwrap()
        let descchunk_id: cyfs.ChunkId = cyfs.ChunkId.calculate(data).unwrap()
        let obj_map: cyfs.BuckyHashMap<cyfs.ObjectId, cyfs.BuckyBuffer> = new cyfs.BuckyHashMap()
        obj_map.set(descchunk_id.calculate_id(), new cyfs.BuckyBuffer(data))
        // 第二种情况，对于超大内容的dir，使用chunk模式，但和上面一种模式是对等的
        let dir: cyfs.Dir
        let dir_id: cyfs.ObjectId = cyfs.ObjectId.default()
        let req_path: string = ""
        let rdata: Uint8Array
        let chunk_id: cyfs.ChunkId | undefined = undefined

        if (mode == chunk_mode.descChunk) {
            // chunk可以放到body缓存里面，方便查找；也可以独立存放，但dir在解析时候需要再次查找该chunk可能会耗时久，以及查找失败等情况
            let builder2 = new cyfs.DirBuilder(new cyfs.DirDescContent(attr, new cyfs.NDNObjectInfo({ chunk_id: descchunk_id })), new cyfs.DirBodyContent({ obj_list: obj_map }));
            dir = builder2.no_create_time().update_time(cyfs.JSBI.BigInt(0)).build(cyfs.Dir)
            dir_id = dir.desc().calculate_id()
            console.log(`-----------> dir_id = ${dir_id}`)
            rdata = dir.to_vec().unwrap()
            chunk_id = descchunk_id
            console.log(`-----------> descchunk_id = ${chunk_id}`)
        }
        else if (mode == chunk_mode.bodyChunk) {
            // body也可以放到chunk,由于只是影响body的结构，所以不影响dir的object_id
            let body_data = cyfs.to_vec(obj_map).unwrap()
            chunk_id = cyfs.ChunkId.calculate(body_data).unwrap()
            console.log(`-----------> bodychunk_id = ${chunk_id}`)
            // 注意： body_chunk_id需要额外的保存到本地，put_data(body_chunk, body_chunk_id)
            let builder3 = new cyfs.DirBuilder(new cyfs.DirDescContent(attr, new cyfs.NDNObjectInfo({ chunk_id: descchunk_id })), new cyfs.DirBodyContent({ chunk_id: chunk_id }));
            dir = builder3.no_create_time().update_time(cyfs.JSBI.BigInt(0)).build(cyfs.Dir)
            dir_id = dir.desc().calculate_id()
            rdata = dir.to_vec().unwrap()
            console.log(`-----------> dir_id = ${dir_id}`)
            let rep: cyfs.NDNPutDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: undefined,
                    // api级别
                    level: cyfs.NDNAPILevel.NDC,
                    // targrt设备参数目前无用
                    target: source.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                object_id: chunk_id.calculate_id(),
                length: rdata.length,
                data: rdata,
            }
            //调用接口
            let resp = await source.ndn_service().put_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `put_data 传输对象失败`)
        }
        if (mount) {
            //注册req_path
            if (mount != "mount-dir") { console.error("--------------> chunk mode mount param must be \"mount-dir\" ") }

            let reqpath = "/test_nDn"
            let stub = source.root_state_stub(source.local_device_id().object_id, source.dec_id);
            let op_env = (await stub.create_path_op_env()).unwrap()
            console.log(`___________+===============mountvalue: ${mount!}`)
            await op_env.set_with_path(reqpath, dir_id!, undefined, true)
            let o = (await op_env.commit()).unwrap()

            req_path = new cyfs.RequestGlobalStatePath(source.dec_id, reqpath).toString()
            console.log("------------------------> " + req_path)
        }
        if (access) {
            // source 设备 将对象put 到 targrt 设备
            await source.non_service().put_object({
                common: {
                    level: cyfs.NONAPILevel.Router,
                    target: target.local_device_id().object_id,
                    flags: 0
                },
                object: new cyfs.NONObjectInfo(dir_id!, rdata!),
                access: access
            })
        }
        return { chunk_id, dir_id, req_path }
        //assert(dir_id2.to_base_58() == dir_id3.to_base_58(), "生成的dirid不相等")

    }
}
