import assert = require('assert');
import {cyfs} from '../../cyfs_node';
import { RandomGenerator } from "./generator";
import * as fs from "fs-extra";
import * as path from "path";
import * as crypto from 'crypto';


import { ZoneSimulator } from "./simulator"
import { ObjectId } from 'mongoose';
import { type } from 'os';

export class NDNTestManager {

    static async transChunksByGetData(source: cyfs.SharedCyfsStack, target: cyfs.SharedCyfsStack, filePath: string, chunkSize: number, chunkNumber: number, level: cyfs.NDNAPILevel, timeout: number = 60 * 1000) {
        console.info('开始chunk 传输流程 get_data')
        console.info(`source:${source.local_device_id()} target:${target.local_device_id()}`)
        //1. source 设备 publish_file 将文件存放到本地NDC 
        let owner = source.local_device().desc().owner()!.unwrap()
        let publish_file_time = Date.now();
        const file_resp_0 = (await source.trans().publish_file({
            common: {
                level: level,
                flags: 0,
                dec_id: ZoneSimulator.APPID,
                target: target.local_device_id().object_id,
                req_path: "",
                referer_object: []

            },
            owner,
            local_path: filePath,
            chunk_size: chunkSize,     // chunk大小4M
            dirs: []
        }));
        publish_file_time = Date.now() - publish_file_time;
        console.info(`publish_file 接口耗时： ${publish_file_time}`);
        if (file_resp_0.err) {
            console.info(file_resp_0);
            return { err: true, log: "transChunks publish_file failed" }
        }
        //assert(!file_resp_0.err,`transChunks publish_file failed`)
        const file_resp: cyfs.TransAddFileResponse = file_resp_0.unwrap();
        //assert(file_resp.file_id)

        //2. source 设备 使用NOC 获取文件对象

        const file_obj_resp_0 = (await source.non_service().get_object({
            common: {
                level: cyfs.NONAPILevel.NOC,
                flags: 0
            },
            object_id: file_resp.file_id
        }))
        if (file_obj_resp_0.err) {
            return { err: true, log: "source noc get file object failed" }
        }
        //assert(!file_obj_resp_0.err,`source noc get file object failed`)
        const file_obj_resp: cyfs.NONGetObjectOutputResponse = file_obj_resp_0.unwrap();
        //3. source 设备 将文件对象put 到 targrt 设备
        let send_object_time = Date.now();
        let put_file_object = (await source.non_service().put_object({
            common: {
                level: cyfs.NONAPILevel.Router,
                target: target.local_device_id().object_id,
                flags: 0
            },
            object: file_obj_resp.object
        }))
        send_object_time = Date.now() - send_object_time;
        console.info(`send file object time: ${send_object_time}`)
        if (put_file_object.err) {
            return { err: true, log: "source put file object to target failed" }
        }
        //assert(!put_file_object.err,`source put file object to target failed`)
        const [file, buf] = new cyfs.FileDecoder().raw_decode(file_obj_resp.object.object_raw).unwrap();
        let chunkIdList = file.body_expect().content().try_to_proto().unwrap().chunk_list!.chunk_id_list

        let chunkRecvPromise: Array<any> = []

        for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
            chunkRecvPromise.push(new Promise(async (v) => {
                setTimeout(() => {
                    v({ err: true, log: `ndn_service get_data timeout` })
                }, timeout)
                let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList![i]).unwrap();
                console.info(`开始传输chunk：${chunkId}`)
                let req: cyfs.NDNGetDataOutputRequest = {
                    common: {
                        // api级别
                        level: level,
                        target: source.local_device_id().object_id,
                        // 需要处理数据的关联对象，主要用以chunk/file等
                        referer_object: [new cyfs.NDNDataRefererObject(file_resp.file_id)],
                        flags: 0,
                    },
                    // 目前只支持ChunkId/FileId/DirId
                    object_id: chunkId.calculate_id(),
                }
                let begin = Date.now();
                let resp = await target.ndn_service().get_data(req)
                console.info(`${chunkId} 下载结果：${resp}`)
                let time = Date.now() - begin;
                if (resp.err) {
                    v({ err: true, log: `ndn_service get_data failed` })
                }
                //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                console.info(`下载chunk 成功： ${JSON.stringify(resp)}，耗时：${time}`)
                v({ err: false, time: time, chunkId: chunkId.calculate_id().to_base_58() })
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
        return { err: false, log: `chunk 下载成功`, download };
    }

    static async transChunksByPutData(source: cyfs.SharedCyfsStack, target: cyfs.SharedCyfsStack, filePath: string, chunkSize: number, chunkNumber: number, level: cyfs.NDNAPILevel, timeout: number = 60 * 1000) {
        console.info('开始chunk 传输流程 put_data')
        console.info(`source:${source.local_device_id()} target:${target.local_device_id()}`)
        //1. source 设备 publish_file 将文件存放到本地NDC 
        let owner = source.local_device().desc().owner()!.unwrap()
        const file_resp_0 = (await source.trans().publish_file({
            common: {
                level: level,
                flags: 0,
                dec_id: ZoneSimulator.APPID,
                target: target.local_device_id().object_id,
                req_path: "",
                referer_object: []

            },
            owner,
            local_path: filePath,
            chunk_size: chunkSize,     // chunk大小4M
            dirs: []
        }));
        if (file_resp_0.err) {
            return { err: true, log: "transChunks publish_file failed" }
        }
        //assert(!file_resp_0.err,`transChunks publish_file failed`)
        const file_resp: cyfs.TransAddFileResponse = file_resp_0.unwrap();
        //assert(file_resp.file_id)

        //2. source 设备 使用NOC 获取文件对象

        const file_obj_resp_0 = (await source.non_service().get_object({
            common: {
                level: cyfs.NONAPILevel.NOC,
                flags: 0
            },
            object_id: file_resp.file_id
        }))
        if (file_obj_resp_0.err) {
            return { err: true, log: "source noc get file object failed" }
        }
        //assert(!file_obj_resp_0.err,`source noc get file object failed`)
        const file_obj_resp: cyfs.NONGetObjectOutputResponse = file_obj_resp_0.unwrap();
        //3. source 设备 将文件对象put 到 targrt 设备
        let put_file_object = (await source.non_service().put_object({
            common: {
                level: cyfs.NONAPILevel.Router,
                target: target.local_device_id().object_id,
                flags: 0
            },
            object: file_obj_resp.object
        }))
        if (put_file_object.err) {
            return { err: true, log: "source put file object to target failed" }
        }
        //assert(!put_file_object.err,`source put file object to target failed`)
        const [file, buf] = new cyfs.FileDecoder().raw_decode(file_obj_resp.object.object_raw).unwrap();
        let chunkIdList = file.body_expect().content().try_to_proto().unwrap().chunk_list!.chunk_id_list

        let chunkRecvPromise: Array<any> = []
        for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
            chunkRecvPromise.push(new Promise(async (v) => {
                let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList![i]).unwrap();
                let req: cyfs.NDNPutDataOutputRequest = {
                    common: {
                        // api级别
                        level: level,
                        target: source.local_device_id().object_id,
                        // 需要处理数据的关联对象，主要用以chunk/file等
                        referer_object: [new cyfs.NDNDataRefererObject(file_resp.file_id)],
                        flags: 0,
                    },
                    // 目前只支持ChunkId/FileId/DirId
                    object_id: chunkId.calculate_id(),
                    length: 1024,
                    data: buff,

                }
                let begin = Date.now();
                let resp = (await target.ndn_service().put_data(req))
                let time = Date.now() - begin;
                if (resp.err) {
                    v({ err: true, log: `ndn_service put_data failed` })
                }
                //assert(!resp.err,`${chunkId.calculate_id()} get_data 失败`)
                console.info(JSON.stringify(resp))
                v({ err: false, time: time, chunkId: chunkId.calculate_id().to_base_58() })
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
        return { err: false, log: `chunk 下载成功`, download };
    }
    static async transChunkSerialBy(source: cyfs.SharedCyfsStack, target: cyfs.SharedCyfsStack, filePath: string, chunkSize: number, chunkNumber: number, level: cyfs.NDNAPILevel, timeout: number = 60 * 1000) {
        console.info('开始chunk 串行传输流程')
        console.info(`source:${source.local_device_id()} target:${target.local_device_id()}`)
        //1. source 设备 publish_file 将文件存放到本地NDC 
        let owner = source.local_device().desc().owner()!.unwrap()
        const file_resp_0 = (await source.trans().publish_file({
            common: {
                level: level,
                flags: 0,
                dec_id: ZoneSimulator.APPID,
                target: target.local_device_id().object_id,
                req_path: "",
                referer_object: []

            },
            owner,
            local_path: filePath,
            chunk_size: chunkSize,     // chunk大小4M
            dirs: []
        }));
        assert(!file_resp_0.err, `transChunks publish_file failed`)
        const file_resp: cyfs.TransAddFileResponse = file_resp_0.unwrap();
        //assert(file_resp.file_id)

        //2. source 设备 使用NOC 获取文件对象

        const file_obj_resp_0 = (await source.non_service().get_object({
            common: {
                level: cyfs.NONAPILevel.NOC,
                flags: 0
            },
            object_id: file_resp.file_id
        }))
        assert(!file_obj_resp_0.err, `source noc get file object failed`)
        const file_obj_resp: cyfs.NONGetObjectOutputResponse = file_obj_resp_0.unwrap();
        //3. source 设备 将文件对象put 到 targrt 设备
        let put_file_object = (await source.non_service().put_object({
            common: {
                level: cyfs.NONAPILevel.Router,
                target: target.local_device_id().object_id,
                flags: 0
            },
            object: file_obj_resp.object
        }))
        assert(!put_file_object.err, `source put file object to target failed`)
        const [file, buf] = new cyfs.FileDecoder().raw_decode(file_obj_resp.object.object_raw).unwrap();
        let chunkIdList = file.body_expect().content().try_to_proto().unwrap().chunk_list!.chunk_id_list

        let chunkRecvPromise: Array<any> = []
        let download = []
        for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
            chunkRecvPromise.push(new Promise(async (v) => {
                let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList![i]).unwrap();
                let req: cyfs.NDNGetDataOutputRequest = {
                    common: {
                        // api级别
                        level: level,
                        target: source.local_device_id().object_id,
                        // 需要处理数据的关联对象，主要用以chunk/file等
                        referer_object: [new cyfs.NDNDataRefererObject(file_resp.file_id)],
                        flags: 0,
                    },
                    // 目前只支持ChunkId/FileId/DirId
                    object_id: chunkId.calculate_id(),
                }
                let begin = Date.now();
                let resp = (await target.ndn_service().get_data(req))
                assert(!resp.err, `${chunkId.calculate_id()} get_data 失败`)
                let time = Date.now() - begin;
                console.info(JSON.stringify(resp))
                v({ result: resp, time: time })
            }))
            let result = await chunkRecvPromise[i]
            if (result.err) {
                return { err: result.err, log: result.log }
            }
            download.push(result)
        }
        return download;
    }

    static async transFile(source: cyfs.SharedCyfsStack, target: cyfs.SharedCyfsStack, filePath: string, chunkSize: number, savePath: string, level: cyfs.NDNAPILevel, timeout: number = 600 * 1000): Promise<{ err: boolean, log: string, time?: number, fileId?: string, totalTime?: number }> {
        //1. source 设备 publish_file 将文件存放到本地NDC 
        let totalTime = 0;
        let begin = Date.now();

        let owner = source.local_device().desc().owner()!.unwrap()
        const file_resp_0 = (await source.trans().publish_file({
            common: {
                level: level,
                flags: 0,
                dec_id: ZoneSimulator.APPID,
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
                referer_object: [new cyfs.NDNDataRefererObject(file_resp.file_id)]
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

    static async addDirToCyfs(source: cyfs.SharedCyfsStack, target: cyfs.SharedCyfsStack, dirPath: string, savePath: string, chunkSize: number, level: cyfs.NDNAPILevel) {
        let outputDir = path.join(savePath, `dirInfo${RandomGenerator.string(10)}.txt`)
        fs.createFileSync(outputDir);
        //判断输入参数是否正确
        if (!fs.pathExistsSync(dirPath)) {
            return { err: true, log: `下载文件夹不存在` }
        }
        //1. source 设备 publish_file 将dir存放到本地NDC  
        let owner = source.local_device().desc().owner()!.unwrap()
        let publish_file_time = Date.now();
        const dir_resp_0 = (await source.trans().publish_file({
            common: {
                level: level,
                flags: 0,
                dec_id: ZoneSimulator.APPID,
                target: target.local_device_id().object_id,
                req_path: "",
                referer_object: []

            },
            owner,
            local_path: dirPath,
            chunk_size: chunkSize,     // chunk大小4M
            dirs: []
        }));
        publish_file_time = Date.now() - publish_file_time;
        console.info(`transDir publish_file 耗时：${publish_file_time}`)
        if (dir_resp_0.err) {
            return { err: true, log: `transDir publish_file failed ` }
        }
        let dir_resp: cyfs.TransAddFileResponse = dir_resp_0.unwrap();
        //2. source 设备 使用NOC 获取dir对象
        const dir_obj_resp_0 = (await source.non_service().get_object({
            common: {
                level: cyfs.NONAPILevel.NOC,
                flags: 0
            },
            object_id: dir_resp.file_id
        }));
        if (dir_obj_resp_0.err) {
            return { err: true, log: `transDir non_service get_object failed ` }
        }
        let dir_obj_resp = dir_obj_resp_0.unwrap();
        //3. source 设备 将dir对象put 到 targrt 设备
        let put_object_time = Date.now();
        let put_object_resp = (await source.non_service().put_object({
            common: {
                level: cyfs.NONAPILevel.Router,
                target: target.local_device_id().object_id,
                flags: 0
            },
            object: dir_obj_resp.object
        }))
        put_object_time = Date.now() - put_object_time;
        if (put_object_resp.err) {
            return { err: true, log: `transDir non_service put_object failed ` }
        }
        fs.appendFileSync(outputDir, `本地publish_file添加文件对象耗时：${publish_file_time},NON传输dir对象耗时：${put_object_time} \n`)
        //4. target 设备 本地重构dir对象文件目录结构，获取下载文件任务列表
        const [dir, _] = new cyfs.DirDecoder().raw_decode(dir_obj_resp.object.object_raw).unwrap();
        let root: TreeNode = {
            type: 'dir',
            subs: new Map(),
        };
        let taskList: Array<FileTransTask> = []
        let fileNum = 0;
        let timeFile = Date.now();
        let sendObjectPromise: any = new Promise(async (v) => {
            dir.desc().content().obj_list().match({
                Chunk: (chunk_id: cyfs.ChunkId) => {
                    console.error(`obj_list in chunk not support yet! ${chunk_id}`);
                },
                ObjList: async (obj_list) => {
                    for (const [inner_path, info] of obj_list.object_map().entries()) {
                        let filePath = savePath;
                        const segs = inner_path.value().split('/');
                        console.assert(segs.length > 0);
                        console.info(`###节点信息：${inner_path},${info.node().object_id()}`)
                        // // source 设备将文件对象发送到target
                        // let time1 = Date.now();
                        // const file_obj_resp = (await source.non_service().get_object({
                        //     common: {
                        //         level: cyfs.NONAPILevel.NOC,
                        //         flags: 0
                        //     },

                        //     object_id: info.node()!.object_id()!
                        // })).unwrap(); 
                        // time1 = Date.now() - time1;
                        // await cyfs.cyfs.sleep(100);
                        // let time2 =  Date.now();
                        // await source.non_service().put_object({
                        //     common: {
                        //         level: cyfs.NONAPILevel.Router,
                        //         target : target.local_device_id().object_id,
                        //         flags: 0
                        //     },
                        //     object: file_obj_resp.object
                        // });
                        // time2 = Date.now() - time2;
                        //await cyfs.cyfs.sleep(100);
                        fileNum = fileNum + 1;
                        fs.appendFileSync(outputDir, `../${inner_path}\t##object_id:  ${info.node().object_id()}\n`)
                        // 一个叶子节点就是一个object_id，可能是FileObj，也可能是DirObj
                        // const leaf_node: TreeNode = {
                        //     name: segs.pop(),
                        //     type: 'object',
                        //     object_id: info.node().object_id()!,
                        // };
                        // let cur = root.subs!;
                        // for (const seg of segs) {
                        //     filePath = path.join(filePath,seg)
                        //     if (!cur.get(seg)) {
                        //         const sub_node: TreeNode = {
                        //             name: seg,
                        //             type: 'dir',
                        //             subs: new Map(),
                        //         };
                        //         console.info(`添加叶子节点dir：${seg} ${sub_node}`)
                        //         cur!.set(seg, sub_node);
                        //         if(!fs.pathExistsSync(filePath)){
                        //             fs.mkdirpSync(filePath)
                        //             console.info(`创建文件夹${filePath}`)
                        //         }

                        //     }
                        //     cur = cur.get(seg)!.subs!;
                        // }
                        // filePath = path.join(filePath,leaf_node.name!)
                        // cur.set(leaf_node.name!, leaf_node);
                        // console.info(`添加叶子节点object：${leaf_node.name!} ${leaf_node}`)
                        // taskList.push({
                        //     fileName : leaf_node.name!,
                        //     object_id : info.node()!.object_id()!,
                        //     savePath : filePath,
                        //     state : 0
                        // })
                    }

                    v("run success")
                }
            })
        })
        await sendObjectPromise;
        timeFile = Date.now() - timeFile;
        fs.appendFileSync(outputDir, `文件总数：${fileNum},解析dir对象耗时：${timeFile} \n`)

    }

    static async transDir(source: cyfs.SharedCyfsStack, target: cyfs.SharedCyfsStack, dirPath: string, chunkSize: number, savePath: string, level: cyfs.NDNAPILevel, timeout: number = 600 * 1000) {
        //判断输入参数是否正确
        if (!fs.pathExistsSync(dirPath)) {
            return { err: true, log: `下载文件夹不存在` }
        }
        if (!fs.pathExistsSync(savePath)) {
            return { err: true, log: `存放目录不存在` }
        }

        //1. source 设备 publish_file 将dir存放到本地NDC  
        let owner = source.local_device().desc().owner()!.unwrap()
        let publish_file_time = Date.now();
        const publish_file_resp = (await source.trans().publish_file({
            common: {
                level: level,
                flags: 0,
                dec_id: ZoneSimulator.APPID,
                req_path: "",
                referer_object: []

            },
            owner,
            local_path: dirPath,
            chunk_size: chunkSize,     // chunk大小4M
            dirs: []
        }));
        console.info(publish_file_resp)
        if (publish_file_resp.err) {
            return { err: true, log: `transDir publish_file failed ` }
        }
        publish_file_time = Date.now() - publish_file_time;
        let publish_file_info: cyfs.TransAddFileResponse = publish_file_resp.unwrap();
        console.info(`#transDir publish_file 耗时：${publish_file_time},file_id = ${publish_file_info.file_id}`)

        //2. source 设备 使用NOC 获取dir map
        const dir_map_resp_0 = (await source.non_service().get_object({
            common: {
                level: cyfs.NONAPILevel.NOC,
                flags: 0
            },
            object_id: publish_file_info.file_id
        }));
        if (dir_map_resp_0.err) {
            return { err: true, log: `transDir non_service get_object failed ` }
        }
        let dir_map = dir_map_resp_0.unwrap();
        let dir_map_source = new cyfs.ObjectMapDecoder().raw_decode(dir_map.object.object_raw).unwrap();
        console.info(`#transDir source dir_map = ${JSON.stringify(dir_map_source.entries())}`)
        //从dir map 获取dir 对象
        let dir_build = await source.util().build_dir_from_object_map({
            common: {
                req_path: "",
                dec_id: ZoneSimulator.APPID,
                flags: 0,
            },
            object_map_id: dir_map.object.object_id,
            dir_type: cyfs.BuildDirType.Zip,
        })
        let dir_id = dir_build.unwrap().object_id;
        console.info(`#transDir build_dir_from_object_map dir_id ; ${dir_id.to_base_58()}`)
        const dir_obj_resp_1 = (await source.non_service().get_object({
            common: {
                level: cyfs.NONAPILevel.NOC,
                flags: 0
            },
            object_id: dir_id
        }));
        if (dir_obj_resp_1.err) {
            return { err: true, log: `transDir non_service get_object failed ` }
        }
        let dir_obj = dir_obj_resp_1.unwrap();
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
            object: dir_map.object
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
            object_id: publish_file_info.file_id
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
                        dec_id: ZoneSimulator.APPID,
                        flags: 0,
                        referer_object: [new cyfs.NDNDataRefererObject(dir_obj_target.object.object_id)]
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
                            dec_id: ZoneSimulator.APPID,
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

    static async addDir(source: cyfs.SharedCyfsStack, target: cyfs.SharedCyfsStack, saveDir: string, fileSize: number, chunkSize: number, level: cyfs.NDNAPILevel) {

        let fileName = `file-${RandomGenerator.string(6)}.txt`
        let inner_path: string = `/testData/${fileName}`
        let datafile = path.join(saveDir, inner_path)
        //(1)清空缓存目录
        if (fs.existsSync(saveDir)) {
            fs.removeSync(saveDir)
        }
        //(2)生成测试文件
        await RandomGenerator.createRandomFile(datafile, fileName, fileSize);

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
            local_path: datafile,
            chunk_size: chunkSize,     // chunk大小4M
            dirs: []
        }));
        publish_file_time = Date.now() - publish_file_time;
        console.info(`addDir publish_file 耗时：${publish_file_time}`)
        assert(!pubres.err, `publish_file 失败`)

        let pub_resp: cyfs.TransAddFileResponse = pubres.unwrap();

        let object_map_id = cyfs.ObjectMapId.try_from_object_id(pub_resp.file_id).unwrap()


        //2. source 设备 使用NOC 获取dir对象
        const getoreq ={
            common: {
                level: cyfs.NONAPILevel.NOC,
                flags: 0
            },
            object_id: pub_resp.file_id,
            inner_path: undefined
        };
        let getores = await source.non_service().get_object(getoreq)
        assert(!getores.err, `get_object 获取dir对象失败`)


        let get_resp = getores.unwrap();
        //let file_id_from_objectmap = cyfs.FileId.try_from_object_id(get_resp.object.object_id).unwrap()

        let req: cyfs.UtilBuildDirFromObjectMapOutputRequest = {
            common: {
                flags: 0
            },
            object_map_id: object_map_id.object_id,
            dir_type: cyfs.BuildDirType.Zip
        };
        let dresp = await (await source.util().build_dir_from_object_map(req)).unwrap()
        let dir_id: cyfs.DirId = cyfs.DirId.try_from_object_id(dresp.object_id).unwrap()


        let greq: cyfs.NONGetObjectOutputRequest = {
            common: {
                req_path: undefined,
                level: cyfs.NONAPILevel.NOC,
                flags: 0,
                target: target.local_device_id().object_id
            },
            object_id: dir_id.object_id,
            inner_path: inner_path
        }
        let gresp = await (await source.non_service().get_object(greq)).unwrap()
        let file_id: cyfs.FileId = cyfs.FileId.try_from_object_id(gresp.object.object_id).unwrap()

        //assert(file_id === file_id_from_objectmap, "fileid 不相等")
        return { file_id, dir_id, inner_path }

    }

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


// 重建dir的目录树结构
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
