import * as fs from "fs-extra";
import assert = require('assert');
import * as cyfs from '../../cyfs_node'
import { ZoneSimulator, stringToUint8Array, RandomGenerator, stackInfo } from "../../common";
import * as path from 'path';
//初始化日志
cyfs.clog.enable_file_log({
    name: "unittest_stack_interface",
    dir: cyfs.get_app_log_dir("unittest_stack_interface"),
    file_max_size: 1024 * 1024 * 10,
    file_max_count: 10,
});

let stack_runtime: cyfs.SharedCyfsStack;
let stack_ood: cyfs.SharedCyfsStack;

const basDecIdA = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT5ze").unwrap();
const basDecIdB = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT6ze").unwrap();
const basDecIdC = cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT7ze").unwrap();
const basDecIdD= cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT8ze").unwrap();
const basDecIdE= cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT9ze").unwrap();
const basDecIdF= cyfs.ObjectId.from_base_58("9tGpLNnErEbyzuMgRLcRX6An1Sn8ZyimNXBdLDTgT1ze").unwrap();


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

    class PostObjectHandler implements cyfs.RouterHandlerPostObjectRoutine {
        async call(param: cyfs.RouterHandlerPostObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerPostObjectResult>> {
            const codec = new cyfs.NONPostObjectOutputRequestJsonCodec();
            console.info('post_object param: ', JSON.stringify(codec.encode_object(param.request)));
    
            //console.info("source=", param.request.common.source.to_base_58());
    
            const [text, buf] = new cyfs.TextObjectDecoder().raw_decode(param.request.object.object_raw).unwrap();
            console.info(`put_object text_object: id=${text.id}, header=${text.header}, body=${text.body}`);
    
            if (text.id === 'request') {
                const obj = cyfs.TextObject.create(cyfs.None, 'response', "test_header", "hello!");
                const object_id = obj.desc().calculate_id();
                console.info(`will response put_object: ${param.request.object.object_id} ---> ${object_id}`);
    
                const object_raw = obj.to_vec().unwrap();
    
                // 修改object，并保存，然后继续后续路由流程
                const result: cyfs.RouterHandlerPostObjectResult = {
                    action: cyfs.RouterHandlerAction.Default,
                    request: param.request,
                    response: cyfs.Ok({
                        object: new cyfs.NONObjectInfo(object_id, object_raw)
                    })
                };
    
                return cyfs.Ok(result);
            }
            return cyfs.Err(new cyfs.BuckyError(cyfs.BuckyErrorCode.NotMatch, "post handler get wrong text id"));
        }
    }
    
    class PostObjectHandlerTest implements cyfs.RouterHandlerPostObjectRoutine {
        async call(param: cyfs.RouterHandlerPostObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerPostObjectResult>> {
            console.info("recv post request: {}", param.request.object.object_id);
            const result: cyfs.RouterHandlerPostObjectResult = {
                action : cyfs.RouterHandlerAction.Response,
                request: undefined,
                response: cyfs.Ok(
                    {object: undefined})    
                };
            return cyfs.Ok(result)
        }
    }
    
    
    class PostObjectHandlerDefault implements cyfs.RouterHandlerPostObjectRoutine {
        //private device: string;
        //private handlerId: string;
        //private chain: string
        private stack:cyfs.SharedCyfsStack
        private path:string
        private acc:cyfs.AccessString
        constructor(stack:cyfs.SharedCyfsStack,path:string,acc:cyfs.AccessString) {
            //this.device = device;
            //this.handlerId = handlerId;
            //this.chain = chain;
            this.stack = stack
            this.path = path
            this.acc = acc
        }
        async call(param: cyfs.RouterHandlerPostObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerPostObjectResult>> {
            //Emitter.emit('handlerRunning', this.device, 'PostObjectHandlerDefault', this.handlerId, this.chain)
            const codec = new cyfs.NONPostObjectOutputRequestJsonCodec();
            let request = codec.encode_object(param.request);
            param.request.object.object_id
            let run = await this.stack.non_service().put_object({
                common: {
                    req_path: this.path,
                    dec_id: this.stack.dec_id,
                    flags: 0,
                    level: cyfs.NONAPILevel.NOC //设置路由类型,
                    
                },
                object: new cyfs.NONObjectInfo(param.request.object.object_id!, param.request.object.object_raw!),
                access: this.acc
            })
            assert(!run.err, `post object handler put object failed`)
            //console.info(`get_object: id=${param.object_id}`);
            const result: cyfs.RouterHandlerPostObjectResult = {
                action: cyfs.RouterHandlerAction.Response,
                request: param.request,
                response: cyfs.Ok({
                    object: new cyfs.NONObjectInfo(param.request.object.object_id, param.request.object.object_raw)
                })
            };
            return cyfs.Ok(result)
        }
    }
    
    class PutObjectHandlerTest implements cyfs.RouterHandlerPutObjectRoutine {
        async call(param: cyfs.RouterHandlerPutObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerPutObjectResult>> {
            const codec = new cyfs.NONPutObjectOutputRequestJsonCodec();
            console.info('put_object param: ', codec.encode_object(param.request));
            const [text, buf] = new cyfs.TextObjectDecoder().raw_decode(param.request.object.object_raw).unwrap();
            console.info(`put_object text_object: id=${text.id}, header=${text.header}, body=${text.body}`);
            const result: cyfs.RouterHandlerPutObjectResult = {
                action: cyfs.RouterHandlerAction.Default,
                request: param.request,
            };
            return cyfs.Ok(result)
        }
    }
    
    class GetObjectHandlerTest implements cyfs.RouterHandlerGetObjectRoutine {
        
        async call(param: cyfs.RouterHandlerGetObjectRequest): Promise<cyfs.BuckyResult<cyfs.RouterHandlerGetObjectResult>> {
            //Emitter.emit('handlerRunning', this.device, 'GetObjectHandlerDefault', this.handlerId, this.chain)
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
    describe("#主从OOD数据同步业务流程冒烟测试",async()=>{
        describe("#协议栈NONRequestor 内put_object接口",async()=>{
            it.only("get_data,chunk对象,同zone同dec,权限验证",async()=>{
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()
        
                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()
        
                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()
        
                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()
        
                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()
        
                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\chunk_source\\11111.txt"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000                
                let path = "/test/api/handler"
                let dec = target.dec_id
                let path_handler = new cyfs.RequestGlobalStatePath(dec, path)
                let acc = new cyfs.AccessString(0)
                acc.set_group_permissions(cyfs.AccessGroup.OthersZone,cyfs.AccessPermissions.Full)
                acc.set_group_permissions(cyfs.AccessGroup.OthersDec,cyfs.AccessPermissions.Full)
                acc.set_group_permissions(cyfs.AccessGroup.CurrentDevice,cyfs.AccessPermissions.Full)
                acc.set_group_permissions(cyfs.AccessGroup.CurrentZone,cyfs.AccessPermissions.Full)
                
                await target.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(path,acc))
                await source.root_state_meta_stub(undefined,undefined).add_access(cyfs.GlobalStatePathAccessItem.new(path,acc))
                
            
            console.info('开始chunk 传输流程 get_data')
            //console.info(`source:${source.local_device_id} target:${target.local_device_id()}`)
            //1. source 设备 publish_file 将文件存放到本地NDC 
            let owner = source.local_device().desc().owner()!.unwrap()
            let publish_file_time = Date.now();
            const file_resp_0 = (await source.trans().publish_file({
                common: {
                    level: level,
                    flags: 0,
                    dec_id: basDecIdA,
                    req_path: "path_handler",
                    referer_object: []
        
                },
                owner:owner,
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
                object_id: file_resp.file_id,
                //inner_path: '/11111.txt'
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
            let chunkIdList = file.body_expect().content().chunk_list.chunk_in_list!
            console.log("chunkIdList",chunkIdList)
            console.log("chunkIdList!.length",chunkIdList.length)
        
            let chunkRecvPromise: Array<any> = []
        
            for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                console.log("chunkIdList_i_ ", i)
                chunkRecvPromise.push(new Promise(async (v) => {
                    setTimeout(() => {
                        v({ err: true, log: `ndn_service get_data timeout` })
                    }, timeout)
                    let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                    console.info(`开始传输chunk：${chunkId},${buff}`)
                    let req: cyfs.NDNGetDataOutputRequest = {
                        common: {
                            // api级别
                            level: level,
                            target: target.local_device_id().object_id,
                            // 需要处理数据的关联对象，主要用以chunk/file等
                            referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)],
                            flags: 0,
                            req_path:""
                        },
                        // 目前只支持ChunkId/FileId/DirId
                        object_id: chunkId.calculate_id(),
                    }
                    let begin = Date.now();
                    let resp = await source.ndn_service().get_data(req)
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
        })
            it("get_data,chunk对象,同zone不同dec,权限验证",async()=>{
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()
        
                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()
        
                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()
        
                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()
        
                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()
        
                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\chunk_source\\11111.txt"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000
            
            console.info('开始chunk 传输流程 get_data')
            //console.info(`source:${source.local_device_id} target:${target.local_device_id()}`)
            //1. source 设备 publish_file 将文件存放到本地NDC 
            let owner = source.local_device().desc().owner()!.unwrap()
            let publish_file_time = Date.now();
            const file_resp_0 = (await source.trans().publish_file({
                common: {
                    level: level,
                    flags: 0,
                    dec_id: basDecIdA,
                    req_path: "",
                    referer_object: []
        
                },
                owner:owner,
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
                object_id: file_resp.file_id,
                //inner_path: '/11111.txt'
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
            let chunkIdList = file.body_expect().content().chunk_list.chunk_in_list!
            console.log("chunkIdList",chunkIdList)
            console.log("chunkIdList!.length",chunkIdList.length)
        
            let chunkRecvPromise: Array<any> = []
        
            for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                console.log("chunkIdList_i_ ", i)
                chunkRecvPromise.push(new Promise(async (v) => {
                    setTimeout(() => {
                        v({ err: true, log: `ndn_service get_data timeout` })
                    }, timeout)
                    let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                    console.info(`开始传输chunk：${chunkId},${buff}`)
                    let req: cyfs.NDNGetDataOutputRequest = {
                        common: {
                            // api级别
                            level: level,
                            target: source.local_device_id().object_id,
                            // 需要处理数据的关联对象，主要用以chunk/file等
                            referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)],
                            flags: 0,
                        },
                        // 目前只支持ChunkId/FileId/DirId
                        object_id: chunkId.calculate_id(),
                    }
                    let begin = Date.now();
                    let resp = await source.ndn_service().get_data(req)
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
        })
            it("get_data,chunk对象,不同zone同dec,权限验证",async()=>{

                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()
        
                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()
        
                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()
        
                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()
        
                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()
        
                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\chunk_source\\11111.txt"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000
            
            console.info('开始chunk 传输流程 get_data')
            //console.info(`source:${source.local_device_id} target:${target.local_device_id()}`)
            //1. source 设备 publish_file 将文件存放到本地NDC 
            let owner = source.local_device().desc().owner()!.unwrap()
            let publish_file_time = Date.now();
            const file_resp_0 = (await source.trans().publish_file({
                common: {
                    level: level,
                    flags: 0,
                    dec_id: basDecIdA,
                    req_path: "",
                    referer_object: []
        
                },
                owner:owner,
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
                object_id: file_resp.file_id,
                //inner_path: '/11111.txt'
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
            let chunkIdList = file.body_expect().content().chunk_list.chunk_in_list!
            console.log("chunkIdList",chunkIdList)
            console.log("chunkIdList!.length",chunkIdList.length)
        
            let chunkRecvPromise: Array<any> = []
        
            for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                console.log("chunkIdList_i_ ", i)
                chunkRecvPromise.push(new Promise(async (v) => {
                    setTimeout(() => {
                        v({ err: true, log: `ndn_service get_data timeout` })
                    }, timeout)
                    let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                    console.info(`开始传输chunk：${chunkId},${buff}`)
                    let req: cyfs.NDNGetDataOutputRequest = {
                        common: {
                            // api级别
                            level: level,
                            target: source.local_device_id().object_id,
                            // 需要处理数据的关联对象，主要用以chunk/file等
                            referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)],
                            flags: 0,
                        },
                        // 目前只支持ChunkId/FileId/DirId
                        object_id: chunkId.calculate_id(),
                    }
                    let begin = Date.now();
                    let resp = await source.ndn_service().get_data(req)
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
        })
            it("get_data,chunk对象,不同zone不同dec,权限验证",async()=>{        
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()
        
                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()
        
                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()
        
                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()
        
                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()
        
                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\chunk_source\\11111.txt"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000
            
            console.info('开始chunk 传输流程 get_data')
            //console.info(`source:${source.local_device_id} target:${target.local_device_id()}`)
            //1. source 设备 publish_file 将文件存放到本地NDC 
            let owner = source.local_device().desc().owner()!.unwrap()
            let publish_file_time = Date.now();
            const file_resp_0 = (await source.trans().publish_file({
                common: {
                    level: level,
                    flags: 0,
                    dec_id: basDecIdA,
                    req_path: "",
                    referer_object: []
        
                },
                owner:owner,
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
                object_id: file_resp.file_id,
                //inner_path: '/11111.txt'
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
            let chunkIdList = file.body_expect().content().chunk_list.chunk_in_list!
            console.log("chunkIdList",chunkIdList)
            console.log("chunkIdList!.length",chunkIdList.length)
        
            let chunkRecvPromise: Array<any> = []
        
            for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                console.log("chunkIdList_i_ ", i)
                chunkRecvPromise.push(new Promise(async (v) => {
                    setTimeout(() => {
                        v({ err: true, log: `ndn_service get_data timeout` })
                    }, timeout)
                    let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                    console.info(`开始传输chunk：${chunkId},${buff}`)
                    let req: cyfs.NDNGetDataOutputRequest = {
                        common: {
                            // api级别
                            level: level,
                            target: source.local_device_id().object_id,
                            // 需要处理数据的关联对象，主要用以chunk/file等
                            referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)],
                            flags: 0,
                        },
                        // 目前只支持ChunkId/FileId/DirId
                        object_id: chunkId.calculate_id(),
                    }
                    let begin = Date.now();
                    let resp = await source.ndn_service().get_data(req)
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
        })
            it("get_data,chunk对象,同zone同dec,无req_path,权限验证",async()=>{        
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()
        
                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()
        
                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()
        
                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()
        
                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()
        
                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\chunk_source\\11111.txt"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000
            
            console.info('开始chunk 传输流程 get_data')
            //console.info(`source:${source.local_device_id} target:${target.local_device_id()}`)
            //1. source 设备 publish_file 将文件存放到本地NDC 
            let owner = source.local_device().desc().owner()!.unwrap()
            let publish_file_time = Date.now();
            const file_resp_0 = (await source.trans().publish_file({
                common: {
                    level: level,
                    flags: 0,
                    dec_id: basDecIdA,
                    req_path: "",
                    referer_object: []
        
                },
                owner:owner,
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
                object_id: file_resp.file_id,
                //inner_path: '/11111.txt'
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
            let chunkIdList = file.body_expect().content().chunk_list.chunk_in_list!
            console.log("chunkIdList",chunkIdList)
            console.log("chunkIdList!.length",chunkIdList.length)
        
            let chunkRecvPromise: Array<any> = []
        
            for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                console.log("chunkIdList_i_ ", i)
                chunkRecvPromise.push(new Promise(async (v) => {
                    setTimeout(() => {
                        v({ err: true, log: `ndn_service get_data timeout` })
                    }, timeout)
                    let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                    console.info(`开始传输chunk：${chunkId},${buff}`)
                    let req: cyfs.NDNGetDataOutputRequest = {
                        common: {
                            // api级别
                            level: level,
                            target: source.local_device_id().object_id,
                            // 需要处理数据的关联对象，主要用以chunk/file等
                            referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)],
                            flags: 0,
                        },
                        // 目前只支持ChunkId/FileId/DirId
                        object_id: chunkId.calculate_id(),
                    }
                    let begin = Date.now();
                    let resp = await source.ndn_service().get_data(req)
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
        })
            it("get_data,chunk对象,同zone不同dec,无req_path,权限验证",async()=>{        
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()
        
                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()
        
                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()
        
                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()
        
                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()
        
                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\chunk_source\\11111.txt"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000
            
            console.info('开始chunk 传输流程 get_data')
            //console.info(`source:${source.local_device_id} target:${target.local_device_id()}`)
            //1. source 设备 publish_file 将文件存放到本地NDC 
            let owner = source.local_device().desc().owner()!.unwrap()
            let publish_file_time = Date.now();
            const file_resp_0 = (await source.trans().publish_file({
                common: {
                    level: level,
                    flags: 0,
                    dec_id: basDecIdA,
                    req_path: "",
                    referer_object: []
        
                },
                owner:owner,
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
                object_id: file_resp.file_id,
                //inner_path: '/11111.txt'
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
            let chunkIdList = file.body_expect().content().chunk_list.chunk_in_list!
            console.log("chunkIdList",chunkIdList)
            console.log("chunkIdList!.length",chunkIdList.length)
        
            let chunkRecvPromise: Array<any> = []
        
            for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                console.log("chunkIdList_i_ ", i)
                chunkRecvPromise.push(new Promise(async (v) => {
                    setTimeout(() => {
                        v({ err: true, log: `ndn_service get_data timeout` })
                    }, timeout)
                    let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                    console.info(`开始传输chunk：${chunkId},${buff}`)
                    let req: cyfs.NDNGetDataOutputRequest = {
                        common: {
                            // api级别
                            level: level,
                            target: source.local_device_id().object_id,
                            // 需要处理数据的关联对象，主要用以chunk/file等
                            referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)],
                            flags: 0,
                        },
                        // 目前只支持ChunkId/FileId/DirId
                        object_id: chunkId.calculate_id(),
                    }
                    let begin = Date.now();
                    let resp = await source.ndn_service().get_data(req)
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
        })
            it("get_data,chunk对象,不同zone同dec,无req_path,权限验证",async()=>{        
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()
        
                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()
        
                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()
        
                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()
        
                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()
        
                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\chunk_source\\11111.txt"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000
            
                console.info('开始chunk 传输流程 get_data')
                //console.info(`source:${source.local_device_id} target:${target.local_device_id()}`)
                //1. source 设备 publish_file 将文件存放到本地NDC 
                let owner = source.local_device().desc().owner()!.unwrap()
                let publish_file_time = Date.now();
                const file_resp_0 = (await source.trans().publish_file({
                    common: {
                        level: level,
                        flags: 0,
                        dec_id: basDecIdA,
                        req_path: "",
                        referer_object: []
            
                    },
                    owner:owner,
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
                    object_id: file_resp.file_id,
                    //inner_path: '/11111.txt'
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
                let chunkIdList = file.body_expect().content().chunk_list.chunk_in_list!
                console.log("chunkIdList",chunkIdList)
                console.log("chunkIdList!.length",chunkIdList.length)
            
                let chunkRecvPromise: Array<any> = []
            
                for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                    console.log("chunkIdList_i_ ", i)
                    chunkRecvPromise.push(new Promise(async (v) => {
                        setTimeout(() => {
                            v({ err: true, log: `ndn_service get_data timeout` })
                        }, timeout)
                        let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                        console.info(`开始传输chunk：${chunkId},${buff}`)
                        let req: cyfs.NDNGetDataOutputRequest = {
                            common: {
                                // api级别
                                level: level,
                                target: source.local_device_id().object_id,
                                // 需要处理数据的关联对象，主要用以chunk/file等
                                referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)],
                                flags: 0,
                            },
                            // 目前只支持ChunkId/FileId/DirId
                            object_id: chunkId.calculate_id(),
                        }
                        let begin = Date.now();
                        let resp = await source.ndn_service().get_data(req)
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
        })
            it("get_data,chunk对象,不同zone不同dec,无req_path,权限验证",async()=>{        
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()
        
                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()
        
                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()
        
                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()
        
                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()
        
                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\chunk_source\\11111.txt"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000
            
                console.info('开始chunk 传输流程 get_data')
                //console.info(`source:${source.local_device_id} target:${target.local_device_id()}`)
                //1. source 设备 publish_file 将文件存放到本地NDC 
                let owner = source.local_device().desc().owner()!.unwrap()
                let publish_file_time = Date.now();
                const file_resp_0 = (await source.trans().publish_file({
                    common: {
                        level: level,
                        flags: 0,
                        dec_id: basDecIdA,
                        req_path: "",
                        referer_object: []
            
                    },
                    owner:owner,
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
                    object_id: file_resp.file_id,
                    //inner_path: '/11111.txt'
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
                let chunkIdList = file.body_expect().content().chunk_list.chunk_in_list!
                console.log("chunkIdList",chunkIdList)
                console.log("chunkIdList!.length",chunkIdList.length)
            
                let chunkRecvPromise: Array<any> = []
            
                for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                    console.log("chunkIdList_i_ ", i)
                    chunkRecvPromise.push(new Promise(async (v) => {
                        setTimeout(() => {
                            v({ err: true, log: `ndn_service get_data timeout` })
                        }, timeout)
                        let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                        console.info(`开始传输chunk：${chunkId},${buff}`)
                        let req: cyfs.NDNGetDataOutputRequest = {
                            common: {
                                // api级别
                                level: level,
                                target: source.local_device_id().object_id,
                                // 需要处理数据的关联对象，主要用以chunk/file等
                                referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)],
                                flags: 0,
                            },
                            // 目前只支持ChunkId/FileId/DirId
                            object_id: chunkId.calculate_id(),
                        }
                        let begin = Date.now();
                        let resp = await source.ndn_service().get_data(req)
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
        })
    })        
        describe("#协议栈NONRequestor 内put_object接口",async()=>{
            it("get_data,chunk对象,同zone同dec,chunk,访问来源file,权限验证",async()=>{
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()
        
                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()
        
                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()
        
                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()
        
                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()
        
                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\chunk_source\\11111.txt"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000
            
            console.info('开始chunk 传输流程 get_data')
            //console.info(`source:${source.local_device_id} target:${target.local_device_id()}`)
            //1. source 设备 publish_file 将文件存放到本地NDC 
            let owner = source.local_device().desc().owner()!.unwrap()
            let publish_file_time = Date.now();
            const file_resp_0 = (await source.trans().publish_file({
                common: {
                    level: level,
                    flags: 0,
                    dec_id: basDecIdA,
                    req_path: "",
                    referer_object: []
        
                },
                owner:owner,
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
                object_id: file_resp.file_id,
                //inner_path: '/11111.txt'
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
            let chunkIdList = file.body_expect().content().chunk_list.chunk_in_list!
            console.log("chunkIdList",chunkIdList)
            console.log("chunkIdList!.length",chunkIdList.length)
        
            let chunkRecvPromise: Array<any> = []
        
            for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                console.log("chunkIdList_i_ ", i)
                chunkRecvPromise.push(new Promise(async (v) => {
                    setTimeout(() => {
                        v({ err: true, log: `ndn_service get_data timeout` })
                    }, timeout)
                    let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                    console.info(`开始传输chunk：${chunkId},${buff}`)
                    let req: cyfs.NDNGetDataOutputRequest = {
                        common: {
                            // api级别
                            level: level,
                            target: source.local_device_id().object_id,
                            // 需要处理数据的关联对象，主要用以chunk/file等
                            referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)],
                            flags: 0,
                        },
                        // 目前只支持ChunkId/FileId/DirId
                        object_id: chunkId.calculate_id(),
                    }
                    let begin = Date.now();
                    let resp = await source.ndn_service().get_data(req)
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
        })
            it("get_data,chunk对象,同zone不同dec,访问来源file,权限验证",async()=>{
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()
        
                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()
        
                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()
        
                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()
        
                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()
        
                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\chunk_source\\11111.txt"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000
            
            console.info('开始chunk 传输流程 get_data')
            //console.info(`source:${source.local_device_id} target:${target.local_device_id()}`)
            //1. source 设备 publish_file 将文件存放到本地NDC 
            let owner = source.local_device().desc().owner()!.unwrap()
            let publish_file_time = Date.now();
            const file_resp_0 = (await source.trans().publish_file({
                common: {
                    level: level,
                    flags: 0,
                    dec_id: basDecIdA,
                    req_path: "",
                    referer_object: []
        
                },
                owner:owner,
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
                object_id: file_resp.file_id,
                //inner_path: '/11111.txt'
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
            let chunkIdList = file.body_expect().content().chunk_list.chunk_in_list!
            console.log("chunkIdList",chunkIdList)
            console.log("chunkIdList!.length",chunkIdList.length)
        
            let chunkRecvPromise: Array<any> = []
        
            for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                console.log("chunkIdList_i_ ", i)
                chunkRecvPromise.push(new Promise(async (v) => {
                    setTimeout(() => {
                        v({ err: true, log: `ndn_service get_data timeout` })
                    }, timeout)
                    let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                    console.info(`开始传输chunk：${chunkId},${buff}`)
                    let req: cyfs.NDNGetDataOutputRequest = {
                        common: {
                            // api级别
                            level: level,
                            target: source.local_device_id().object_id,
                            // 需要处理数据的关联对象，主要用以chunk/file等
                            referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)],
                            flags: 0,
                        },
                        // 目前只支持ChunkId/FileId/DirId
                        object_id: chunkId.calculate_id(),
                    }
                    let begin = Date.now();
                    let resp = await source.ndn_service().get_data(req)
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
        })
            it("get_data,chunk对象,不同zone同dec,访问来源file,权限验证",async()=>{
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()
        
                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()
        
                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()
        
                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()
        
                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()
        
                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\chunk_source\\11111.txt"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000
            
            console.info('开始chunk 传输流程 get_data')
            //console.info(`source:${source.local_device_id} target:${target.local_device_id()}`)
            //1. source 设备 publish_file 将文件存放到本地NDC 
            let owner = source.local_device().desc().owner()!.unwrap()
            let publish_file_time = Date.now();
            const file_resp_0 = (await source.trans().publish_file({
                common: {
                    level: level,
                    flags: 0,
                    dec_id: basDecIdA,
                    req_path: "",
                    referer_object: []
        
                },
                owner:owner,
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
                object_id: file_resp.file_id,
                //inner_path: '/11111.txt'
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
            let chunkIdList = file.body_expect().content().chunk_list.chunk_in_list!
            console.log("chunkIdList",chunkIdList)
            console.log("chunkIdList!.length",chunkIdList.length)
        
            let chunkRecvPromise: Array<any> = []
        
            for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                console.log("chunkIdList_i_ ", i)
                chunkRecvPromise.push(new Promise(async (v) => {
                    setTimeout(() => {
                        v({ err: true, log: `ndn_service get_data timeout` })
                    }, timeout)
                    let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                    console.info(`开始传输chunk：${chunkId},${buff}`)
                    let req: cyfs.NDNGetDataOutputRequest = {
                        common: {
                            // api级别
                            level: level,
                            target: source.local_device_id().object_id,
                            // 需要处理数据的关联对象，主要用以chunk/file等
                            referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)],
                            flags: 0,
                        },
                        // 目前只支持ChunkId/FileId/DirId
                        object_id: chunkId.calculate_id(),
                    }
                    let begin = Date.now();
                    let resp = await source.ndn_service().get_data(req)
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
        })
            it("get_data,chunk对象,不同zone不同dec,访问来源file,权限验证",async()=>{
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()
        
                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()
        
                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()
        
                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()
        
                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()
        
                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\chunk_source\\11111.txt"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000
            
            console.info('开始chunk 传输流程 get_data')
            //console.info(`source:${source.local_device_id} target:${target.local_device_id()}`)
            //1. source 设备 publish_file 将文件存放到本地NDC 
            let owner = source.local_device().desc().owner()!.unwrap()
            let publish_file_time = Date.now();
            const file_resp_0 = (await source.trans().publish_file({
                common: {
                    level: level,
                    flags: 0,
                    dec_id: basDecIdA,
                    req_path: "",
                    referer_object: []
        
                },
                owner:owner,
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
                object_id: file_resp.file_id,
                //inner_path: '/11111.txt'
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
            let chunkIdList = file.body_expect().content().chunk_list.chunk_in_list!
            console.log("chunkIdList",chunkIdList)
            console.log("chunkIdList!.length",chunkIdList.length)
        
            let chunkRecvPromise: Array<any> = []
        
            for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                console.log("chunkIdList_i_ ", i)
                chunkRecvPromise.push(new Promise(async (v) => {
                    setTimeout(() => {
                        v({ err: true, log: `ndn_service get_data timeout` })
                    }, timeout)
                    let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                    console.info(`开始传输chunk：${chunkId},${buff}`)
                    let req: cyfs.NDNGetDataOutputRequest = {
                        common: {
                            // api级别
                            level: level,
                            target: source.local_device_id().object_id,
                            // 需要处理数据的关联对象，主要用以chunk/file等
                            referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)],
                            flags: 0,
                        },
                        // 目前只支持ChunkId/FileId/DirId
                        object_id: chunkId.calculate_id(),
                    }
                    let begin = Date.now();
                    let resp = await source.ndn_service().get_data(req)
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
        })
            it("get_data,chunk对象,同zone同dec,chunk,访问来源file,无req_path,传输权限验证",async()=>{
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()
        
                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()
        
                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()
        
                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()
        
                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()
        
                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\chunk_source\\11111.txt"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000
            
            console.info('开始chunk 传输流程 get_data')
            //console.info(`source:${source.local_device_id} target:${target.local_device_id()}`)
            //1. source 设备 publish_file 将文件存放到本地NDC 
            let owner = source.local_device().desc().owner()!.unwrap()
            let publish_file_time = Date.now();
            const file_resp_0 = (await source.trans().publish_file({
                common: {
                    level: level,
                    flags: 0,
                    dec_id: basDecIdA,
                    req_path: "",
                    referer_object: []
        
                },
                owner:owner,
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
                object_id: file_resp.file_id,
                //inner_path: '/11111.txt'
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
            let chunkIdList = file.body_expect().content().chunk_list.chunk_in_list!
            console.log("chunkIdList",chunkIdList)
            console.log("chunkIdList!.length",chunkIdList.length)
        
            let chunkRecvPromise: Array<any> = []
        
            for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                console.log("chunkIdList_i_ ", i)
                chunkRecvPromise.push(new Promise(async (v) => {
                    setTimeout(() => {
                        v({ err: true, log: `ndn_service get_data timeout` })
                    }, timeout)
                    let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                    console.info(`开始传输chunk：${chunkId},${buff}`)
                    let req: cyfs.NDNGetDataOutputRequest = {
                        common: {
                            // api级别
                            level: level,
                            target: source.local_device_id().object_id,
                            // 需要处理数据的关联对象，主要用以chunk/file等
                            referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)],
                            flags: 0,
                        },
                        // 目前只支持ChunkId/FileId/DirId
                        object_id: chunkId.calculate_id(),
                    }
                    let begin = Date.now();
                    let resp = await source.ndn_service().get_data(req)
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
        })
            it("get_data,chunk对象,同zone不同dec,访问来源file,无req_path,传输权限验证",async()=>{
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()
        
                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()
        
                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()
        
                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()
        
                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()
        
                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\chunk_source\\11111.txt"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000
            
            console.info('开始chunk 传输流程 get_data')
            //console.info(`source:${source.local_device_id} target:${target.local_device_id()}`)
            //1. source 设备 publish_file 将文件存放到本地NDC 
            let owner = source.local_device().desc().owner()!.unwrap()
            let publish_file_time = Date.now();
            const file_resp_0 = (await source.trans().publish_file({
                common: {
                    level: level,
                    flags: 0,
                    dec_id: basDecIdA,
                    req_path: "",
                    referer_object: []
        
                },
                owner:owner,
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
                object_id: file_resp.file_id,
                //inner_path: '/11111.txt'
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
            let chunkIdList = file.body_expect().content().chunk_list.chunk_in_list!
            console.log("chunkIdList",chunkIdList)
            console.log("chunkIdList!.length",chunkIdList.length)
        
            let chunkRecvPromise: Array<any> = []
        
            for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                console.log("chunkIdList_i_ ", i)
                chunkRecvPromise.push(new Promise(async (v) => {
                    setTimeout(() => {
                        v({ err: true, log: `ndn_service get_data timeout` })
                    }, timeout)
                    let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                    console.info(`开始传输chunk：${chunkId},${buff}`)
                    let req: cyfs.NDNGetDataOutputRequest = {
                        common: {
                            // api级别
                            level: level,
                            target: source.local_device_id().object_id,
                            // 需要处理数据的关联对象，主要用以chunk/file等
                            referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)],
                            flags: 0,
                        },
                        // 目前只支持ChunkId/FileId/DirId
                        object_id: chunkId.calculate_id(),
                    }
                    let begin = Date.now();
                    let resp = await source.ndn_service().get_data(req)
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
        })
            it("get_data,chunk对象,不同zone同dec,访问来源file,无req_path,传输权限验证",async()=>{
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()
        
                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()
        
                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()
        
                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()
        
                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()
        
                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\chunk_source\\11111.txt"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000
            
            console.info('开始chunk 传输流程 get_data')
            //console.info(`source:${source.local_device_id} target:${target.local_device_id()}`)
            //1. source 设备 publish_file 将文件存放到本地NDC 
            let owner = source.local_device().desc().owner()!.unwrap()
            let publish_file_time = Date.now();
            const file_resp_0 = (await source.trans().publish_file({
                common: {
                    level: level,
                    flags: 0,
                    dec_id: basDecIdA,
                    req_path: "",
                    referer_object: []
        
                },
                owner:owner,
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
                object_id: file_resp.file_id,
                //inner_path: '/11111.txt'
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
            let chunkIdList = file.body_expect().content().chunk_list.chunk_in_list!
            console.log("chunkIdList",chunkIdList)
            console.log("chunkIdList!.length",chunkIdList.length)
        
            let chunkRecvPromise: Array<any> = []
        
            for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                console.log("chunkIdList_i_ ", i)
                chunkRecvPromise.push(new Promise(async (v) => {
                    setTimeout(() => {
                        v({ err: true, log: `ndn_service get_data timeout` })
                    }, timeout)
                    let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                    console.info(`开始传输chunk：${chunkId},${buff}`)
                    let req: cyfs.NDNGetDataOutputRequest = {
                        common: {
                            // api级别
                            level: level,
                            target: source.local_device_id().object_id,
                            // 需要处理数据的关联对象，主要用以chunk/file等
                            referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)],
                            flags: 0,
                        },
                        // 目前只支持ChunkId/FileId/DirId
                        object_id: chunkId.calculate_id(),
                    }
                    let begin = Date.now();
                    let resp = await source.ndn_service().get_data(req)
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
        })
            it("get_data,chunk对象,不同zone不同dec,访问来源file,无req_path,传输权限验证",async()=>{
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()
        
                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()
        
                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()
        
                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()
        
                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()
        
                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\chunk_source\\11111.txt"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000
            
            console.info('开始chunk 传输流程 get_data')
            //console.info(`source:${source.local_device_id} target:${target.local_device_id()}`)
            //1. source 设备 publish_file 将文件存放到本地NDC 
            let owner = source.local_device().desc().owner()!.unwrap()
            let publish_file_time = Date.now();
            const file_resp_0 = (await source.trans().publish_file({
                common: {
                    level: level,
                    flags: 0,
                    dec_id: basDecIdA,
                    req_path: "",
                    referer_object: []
        
                },
                owner:owner,
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
                object_id: file_resp.file_id,
                //inner_path: '/11111.txt'
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
            let chunkIdList = file.body_expect().content().chunk_list.chunk_in_list!
            console.log("chunkIdList",chunkIdList)
            console.log("chunkIdList!.length",chunkIdList.length)
        
            let chunkRecvPromise: Array<any> = []
        
            for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                console.log("chunkIdList_i_ ", i)
                chunkRecvPromise.push(new Promise(async (v) => {
                    setTimeout(() => {
                        v({ err: true, log: `ndn_service get_data timeout` })
                    }, timeout)
                    let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                    console.info(`开始传输chunk：${chunkId},${buff}`)
                    let req: cyfs.NDNGetDataOutputRequest = {
                        common: {
                            // api级别
                            level: level,
                            target: source.local_device_id().object_id,
                            // 需要处理数据的关联对象，主要用以chunk/file等
                            referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)],
                            flags: 0,
                        },
                        // 目前只支持ChunkId/FileId/DirId
                        object_id: chunkId.calculate_id(),
                    }
                    let begin = Date.now();
                    let resp = await source.ndn_service().get_data(req)
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
        })
    })
        describe("#协议栈NONRequestor 内put_object接口",async()=>{
            it("get_data,chunk对象,同zone同dec,访问来源dir,权限验证",async()=>{        
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()
        
                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()
        
                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()
        
                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()
        
                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()
        
                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\chunk_source\\11111.txt"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000
            
            console.info('开始chunk 传输流程 get_data')
            //console.info(`source:${source.local_device_id} target:${target.local_device_id()}`)
            //1. source 设备 publish_file 将文件存放到本地NDC 
            let owner = source.local_device().desc().owner()!.unwrap()
            let publish_file_time = Date.now();
            const file_resp_0 = (await source.trans().publish_file({
                common: {
                    level: level,
                    flags: 0,
                    dec_id: basDecIdA,
                    req_path: "",
                    referer_object: []
        
                },
                owner:owner,
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
                object_id: file_resp.file_id,
                //inner_path: '/11111.txt'
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
            let chunkIdList = file.body_expect().content().chunk_list.chunk_in_list!
            console.log("chunkIdList",chunkIdList)
            console.log("chunkIdList!.length",chunkIdList.length)
        
            let chunkRecvPromise: Array<any> = []
        
            for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                console.log("chunkIdList_i_ ", i)
                chunkRecvPromise.push(new Promise(async (v) => {
                    setTimeout(() => {
                        v({ err: true, log: `ndn_service get_data timeout` })
                    }, timeout)
                    let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                    console.info(`开始传输chunk：${chunkId},${buff}`)
                    let req: cyfs.NDNGetDataOutputRequest = {
                        common: {
                            // api级别
                            level: level,
                            target: source.local_device_id().object_id,
                            // 需要处理数据的关联对象，主要用以chunk/file等
                            referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)],
                            flags: 0,
                        },
                        // 目前只支持ChunkId/FileId/DirId
                        object_id: chunkId.calculate_id(),
                    }
                    let begin = Date.now();
                    let resp = await source.ndn_service().get_data(req)
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
        })
            it("get_data,chunk对象,同zone不同dec,访问来源dir,权限验证",async()=>{
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()
        
                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()
        
                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()
        
                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()
        
                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()
        
                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\chunk_source\\11111.txt"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000
            
            console.info('开始chunk 传输流程 get_data')
            //console.info(`source:${source.local_device_id} target:${target.local_device_id()}`)
            //1. source 设备 publish_file 将文件存放到本地NDC 
            let owner = source.local_device().desc().owner()!.unwrap()
            let publish_file_time = Date.now();
            const file_resp_0 = (await source.trans().publish_file({
                common: {
                    level: level,
                    flags: 0,
                    dec_id: basDecIdA,
                    req_path: "",
                    referer_object: []
        
                },
                owner:owner,
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
                object_id: file_resp.file_id,
                //inner_path: '/11111.txt'
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
            let chunkIdList = file.body_expect().content().chunk_list.chunk_in_list!
            console.log("chunkIdList",chunkIdList)
            console.log("chunkIdList!.length",chunkIdList.length)
        
            let chunkRecvPromise: Array<any> = []
        
            for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                console.log("chunkIdList_i_ ", i)
                chunkRecvPromise.push(new Promise(async (v) => {
                    setTimeout(() => {
                        v({ err: true, log: `ndn_service get_data timeout` })
                    }, timeout)
                    let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                    console.info(`开始传输chunk：${chunkId},${buff}`)
                    let req: cyfs.NDNGetDataOutputRequest = {
                        common: {
                            // api级别
                            level: level,
                            target: source.local_device_id().object_id,
                            // 需要处理数据的关联对象，主要用以chunk/file等
                            referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)],
                            flags: 0,
                        },
                        // 目前只支持ChunkId/FileId/DirId
                        object_id: chunkId.calculate_id(),
                    }
                    let begin = Date.now();
                    let resp = await source.ndn_service().get_data(req)
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
        })
            it("get_data,chunk对象,不同zone同dec,访问来源dir,权限验证",async()=>{
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()
        
                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()
        
                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()
        
                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()
        
                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()
        
                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\chunk_source\\11111.txt"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000
            
            console.info('开始chunk 传输流程 get_data')
            //console.info(`source:${source.local_device_id} target:${target.local_device_id()}`)
            //1. source 设备 publish_file 将文件存放到本地NDC 
            let owner = source.local_device().desc().owner()!.unwrap()
            let publish_file_time = Date.now();
            const file_resp_0 = (await source.trans().publish_file({
                common: {
                    level: level,
                    flags: 0,
                    dec_id: basDecIdA,
                    req_path: "",
                    referer_object: []
        
                },
                owner:owner,
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
                object_id: file_resp.file_id,
                //inner_path: '/11111.txt'
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
            let chunkIdList = file.body_expect().content().chunk_list.chunk_in_list!
            console.log("chunkIdList",chunkIdList)
            console.log("chunkIdList!.length",chunkIdList.length)
        
            let chunkRecvPromise: Array<any> = []
        
            for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                console.log("chunkIdList_i_ ", i)
                chunkRecvPromise.push(new Promise(async (v) => {
                    setTimeout(() => {
                        v({ err: true, log: `ndn_service get_data timeout` })
                    }, timeout)
                    let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                    console.info(`开始传输chunk：${chunkId},${buff}`)
                    let req: cyfs.NDNGetDataOutputRequest = {
                        common: {
                            // api级别
                            level: level,
                            target: source.local_device_id().object_id,
                            // 需要处理数据的关联对象，主要用以chunk/file等
                            referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)],
                            flags: 0,
                        },
                        // 目前只支持ChunkId/FileId/DirId
                        object_id: chunkId.calculate_id(),
                    }
                    let begin = Date.now();
                    let resp = await source.ndn_service().get_data(req)
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
        })
            it("get_data,chunk对象,不同zone不同dec,访问来源dir,权限验证",async()=>{       
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()
        
                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()
        
                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()
        
                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()
        
                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()
        
                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\chunk_source\\11111.txt"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000
            
            console.info('开始chunk 传输流程 get_data')
            //console.info(`source:${source.local_device_id} target:${target.local_device_id()}`)
            //1. source 设备 publish_file 将文件存放到本地NDC 
            let owner = source.local_device().desc().owner()!.unwrap()
            let publish_file_time = Date.now();
            const file_resp_0 = (await source.trans().publish_file({
                common: {
                    level: level,
                    flags: 0,
                    dec_id: basDecIdA,
                    req_path: "",
                    referer_object: []
        
                },
                owner:owner,
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
                object_id: file_resp.file_id,
                //inner_path: '/11111.txt'
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
            let chunkIdList = file.body_expect().content().chunk_list.chunk_in_list!
            console.log("chunkIdList",chunkIdList)
            console.log("chunkIdList!.length",chunkIdList.length)
        
            let chunkRecvPromise: Array<any> = []
        
            for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                console.log("chunkIdList_i_ ", i)
                chunkRecvPromise.push(new Promise(async (v) => {
                    setTimeout(() => {
                        v({ err: true, log: `ndn_service get_data timeout` })
                    }, timeout)
                    let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                    console.info(`开始传输chunk：${chunkId},${buff}`)
                    let req: cyfs.NDNGetDataOutputRequest = {
                        common: {
                            // api级别
                            level: level,
                            target: source.local_device_id().object_id,
                            // 需要处理数据的关联对象，主要用以chunk/file等
                            referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)],
                            flags: 0,
                        },
                        // 目前只支持ChunkId/FileId/DirId
                        object_id: chunkId.calculate_id(),
                    }
                    let begin = Date.now();
                    let resp = await source.ndn_service().get_data(req)
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
        })
            it("get_data,chunk对象,同zone同dec,访问来源dir,无req_path,权限验证",async()=>{        
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()
        
                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()
        
                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()
        
                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()
        
                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()
        
                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\chunk_source\\11111.txt"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000
            
            console.info('开始chunk 传输流程 get_data')
            //console.info(`source:${source.local_device_id} target:${target.local_device_id()}`)
            //1. source 设备 publish_file 将文件存放到本地NDC 
            let owner = source.local_device().desc().owner()!.unwrap()
            let publish_file_time = Date.now();
            const file_resp_0 = (await source.trans().publish_file({
                common: {
                    level: level,
                    flags: 0,
                    dec_id: basDecIdA,
                    req_path: "",
                    referer_object: []
        
                },
                owner:owner,
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
                object_id: file_resp.file_id,
                //inner_path: '/11111.txt'
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
            let chunkIdList = file.body_expect().content().chunk_list.chunk_in_list!
            console.log("chunkIdList",chunkIdList)
            console.log("chunkIdList!.length",chunkIdList.length)
        
            let chunkRecvPromise: Array<any> = []
        
            for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                console.log("chunkIdList_i_ ", i)
                chunkRecvPromise.push(new Promise(async (v) => {
                    setTimeout(() => {
                        v({ err: true, log: `ndn_service get_data timeout` })
                    }, timeout)
                    let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                    console.info(`开始传输chunk：${chunkId},${buff}`)
                    let req: cyfs.NDNGetDataOutputRequest = {
                        common: {
                            // api级别
                            level: level,
                            target: source.local_device_id().object_id,
                            // 需要处理数据的关联对象，主要用以chunk/file等
                            referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)],
                            flags: 0,
                        },
                        // 目前只支持ChunkId/FileId/DirId
                        object_id: chunkId.calculate_id(),
                    }
                    let begin = Date.now();
                    let resp = await source.ndn_service().get_data(req)
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
        })
            it("get_data,chunk对象,同zone不同dec,访问来源dir,无req_path,权限验证",async()=>{        
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()
        
                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()
        
                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()
        
                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()
        
                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()
        
                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\chunk_source\\11111.txt"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000
            
            console.info('开始chunk 传输流程 get_data')
            //console.info(`source:${source.local_device_id} target:${target.local_device_id()}`)
            //1. source 设备 publish_file 将文件存放到本地NDC 
            let owner = source.local_device().desc().owner()!.unwrap()
            let publish_file_time = Date.now();
            const file_resp_0 = (await source.trans().publish_file({
                common: {
                    level: level,
                    flags: 0,
                    dec_id: basDecIdA,
                    req_path: "",
                    referer_object: []
        
                },
                owner:owner,
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
                object_id: file_resp.file_id,
                //inner_path: '/11111.txt'
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
            let chunkIdList = file.body_expect().content().chunk_list.chunk_in_list!
            console.log("chunkIdList",chunkIdList)
            console.log("chunkIdList!.length",chunkIdList.length)
        
            let chunkRecvPromise: Array<any> = []
        
            for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                console.log("chunkIdList_i_ ", i)
                chunkRecvPromise.push(new Promise(async (v) => {
                    setTimeout(() => {
                        v({ err: true, log: `ndn_service get_data timeout` })
                    }, timeout)
                    let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                    console.info(`开始传输chunk：${chunkId},${buff}`)
                    let req: cyfs.NDNGetDataOutputRequest = {
                        common: {
                            // api级别
                            level: level,
                            target: source.local_device_id().object_id,
                            // 需要处理数据的关联对象，主要用以chunk/file等
                            referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)],
                            flags: 0,
                        },
                        // 目前只支持ChunkId/FileId/DirId
                        object_id: chunkId.calculate_id(),
                    }
                    let begin = Date.now();
                    let resp = await source.ndn_service().get_data(req)
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
        })
            it("get_data,chunk对象,不同zone同dec,访问来源dir,无req_path,权限验证",async()=>{        
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()
        
                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()
        
                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()
        
                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()
        
                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()
        
                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\chunk_source\\11111.txt"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000
            
            console.info('开始chunk 传输流程 get_data')
            //console.info(`source:${source.local_device_id} target:${target.local_device_id()}`)
            //1. source 设备 publish_file 将文件存放到本地NDC 
            let owner = source.local_device().desc().owner()!.unwrap()
            let publish_file_time = Date.now();
            const file_resp_0 = (await source.trans().publish_file({
                common: {
                    level: level,
                    flags: 0,
                    dec_id: basDecIdA,
                    req_path: "",
                    referer_object: []
        
                },
                owner:owner,
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
                object_id: file_resp.file_id,
                //inner_path: '/11111.txt'
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
            let chunkIdList = file.body_expect().content().chunk_list.chunk_in_list!
            console.log("chunkIdList",chunkIdList)
            console.log("chunkIdList!.length",chunkIdList.length)
        
            let chunkRecvPromise: Array<any> = []
        
            for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                console.log("chunkIdList_i_ ", i)
                chunkRecvPromise.push(new Promise(async (v) => {
                    setTimeout(() => {
                        v({ err: true, log: `ndn_service get_data timeout` })
                    }, timeout)
                    let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                    console.info(`开始传输chunk：${chunkId},${buff}`)
                    let req: cyfs.NDNGetDataOutputRequest = {
                        common: {
                            // api级别
                            level: level,
                            target: source.local_device_id().object_id,
                            // 需要处理数据的关联对象，主要用以chunk/file等
                            referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)],
                            flags: 0,
                        },
                        // 目前只支持ChunkId/FileId/DirId
                        object_id: chunkId.calculate_id(),
                    }
                    let begin = Date.now();
                    let resp = await source.ndn_service().get_data(req)
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
        })
            it("get_data,chunk对象,不同zone不同dec,访问来源dir,无req_path,权限验证",async()=>{        
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()
        
                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()
        
                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()
        
                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()
        
                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()
        
                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()
            

                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\chunk_source\\11111.txt"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000

            console.info('开始chunk 传输流程 get_data')
            //console.info(`source:${source.local_device_id} target:${target.local_device_id()}`)
            //1. source 设备 publish_file 将文件存放到本地NDC 
            let owner = source.local_device().desc().owner()!.unwrap()
            let publish_file_time = Date.now();
            const file_resp_0 = (await source.trans().publish_file({
                common: {
                    level: level,
                    flags: 0,
                    dec_id: basDecIdA,
                    req_path: "",
                    referer_object: []
        
                },
                owner:owner,
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
                object_id: file_resp.file_id,
                //inner_path: '/11111.txt'
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
            let chunkIdList = file.body_expect().content().chunk_list.chunk_in_list!
            console.log("chunkIdList",chunkIdList)
            console.log("chunkIdList!.length",chunkIdList.length)
        
            let chunkRecvPromise: Array<any> = []
        
            for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                console.log("chunkIdList_i_ ", i)
                chunkRecvPromise.push(new Promise(async (v) => {
                    setTimeout(() => {
                        v({ err: true, log: `ndn_service get_data timeout` })
                    }, timeout)
                    let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                    console.info(`开始传输chunk：${chunkId},${buff}`)
                    let req: cyfs.NDNGetDataOutputRequest = {
                        common: {
                            // api级别
                            level: level,
                            target: source.local_device_id().object_id,
                            // 需要处理数据的关联对象，主要用以chunk/file等
                            referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)],
                            flags: 0,
                        },
                        // 目前只支持ChunkId/FileId/DirId
                        object_id: chunkId.calculate_id(),
                    }
                    let begin = Date.now();
                    let resp = await source.ndn_service().get_data(req)
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
        })
    })
        describe("#协议栈NONRequestor 内put_object接口",async()=>{
            it("get_data,chunk对象,同zone同dec,访问来源objectmap+inner_path,权限验证",async()=>{
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()
        
                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()
        
                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()
        
                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()
        
                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()
        
                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()


                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\chunk_source\\11111.txt"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000
            
            console.info('开始chunk 传输流程 get_data')
            //console.info(`source:${source.local_device_id} target:${target.local_device_id()}`)
            //1. source 设备 publish_file 将文件存放到本地NDC 
            let owner = source.local_device().desc().owner()!.unwrap()
            let publish_file_time = Date.now();
            const file_resp_0 = (await source.trans().publish_file({
                common: {
                    level: level,
                    flags: 0,
                    dec_id: basDecIdA,
                    req_path: "",
                    referer_object: []
        
                },
                owner:owner,
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
                object_id: file_resp.file_id,
                //inner_path: '/11111.txt'
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
            let chunkIdList = file.body_expect().content().chunk_list.chunk_in_list!
            console.log("chunkIdList",chunkIdList)
            console.log("chunkIdList!.length",chunkIdList.length)
        
            let chunkRecvPromise: Array<any> = []
        
            for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                console.log("chunkIdList_i_ ", i)
                chunkRecvPromise.push(new Promise(async (v) => {
                    setTimeout(() => {
                        v({ err: true, log: `ndn_service get_data timeout` })
                    }, timeout)
                    let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                    console.info(`开始传输chunk：${chunkId},${buff}`)
                    let req: cyfs.NDNGetDataOutputRequest = {
                        common: {
                            // api级别
                            level: level,
                            target: source.local_device_id().object_id,
                            // 需要处理数据的关联对象，主要用以chunk/file等
                            referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)],
                            flags: 0,
                        },
                        // 目前只支持ChunkId/FileId/DirId
                        object_id: chunkId.calculate_id(),
                    }
                    let begin = Date.now();
                    let resp = await source.ndn_service().get_data(req)
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
            })
            it("get_data,chunk对象,同zone不同dec,访问来源objectmap+inner_path,权限验证",async()=>{
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()
        
                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()
        
                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()
        
                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()
        
                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()
        
                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()


                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\chunk_source\\11111.txt"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000
            
            console.info('开始chunk 传输流程 get_data')
            //console.info(`source:${source.local_device_id} target:${target.local_device_id()}`)
            //1. source 设备 publish_file 将文件存放到本地NDC 
            let owner = source.local_device().desc().owner()!.unwrap()
            let publish_file_time = Date.now();
            const file_resp_0 = (await source.trans().publish_file({
                common: {
                    level: level,
                    flags: 0,
                    dec_id: basDecIdA,
                    req_path: "",
                    referer_object: []
        
                },
                owner:owner,
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
                object_id: file_resp.file_id,
                //inner_path: '/11111.txt'
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
            let chunkIdList = file.body_expect().content().chunk_list.chunk_in_list!
            console.log("chunkIdList",chunkIdList)
            console.log("chunkIdList!.length",chunkIdList.length)
        
            let chunkRecvPromise: Array<any> = []
        
            for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                console.log("chunkIdList_i_ ", i)
                chunkRecvPromise.push(new Promise(async (v) => {
                    setTimeout(() => {
                        v({ err: true, log: `ndn_service get_data timeout` })
                    }, timeout)
                    let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                    console.info(`开始传输chunk：${chunkId},${buff}`)
                    let req: cyfs.NDNGetDataOutputRequest = {
                        common: {
                            // api级别
                            level: level,
                            target: source.local_device_id().object_id,
                            // 需要处理数据的关联对象，主要用以chunk/file等
                            referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)],
                            flags: 0,
                        },
                        // 目前只支持ChunkId/FileId/DirId
                        object_id: chunkId.calculate_id(),
                    }
                    let begin = Date.now();
                    let resp = await source.ndn_service().get_data(req)
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
            })
            it("get_data,chunk对象,不同zone同dec,访问来源objectmap+inner_path,权限验证",async()=>{
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()
        
                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()
        
                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()
        
                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()
        
                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()
        
                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\chunk_source\\11111.txt"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000
            
            console.info('开始chunk 传输流程 get_data')
            //console.info(`source:${source.local_device_id} target:${target.local_device_id()}`)
            //1. source 设备 publish_file 将文件存放到本地NDC 
            let owner = source.local_device().desc().owner()!.unwrap()
            let publish_file_time = Date.now();
            const file_resp_0 = (await source.trans().publish_file({
                common: {
                    level: level,
                    flags: 0,
                    dec_id: basDecIdA,
                    req_path: "",
                    referer_object: []
        
                },
                owner:owner,
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
                object_id: file_resp.file_id,
                //inner_path: '/11111.txt'
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
            let chunkIdList = file.body_expect().content().chunk_list.chunk_in_list!
            console.log("chunkIdList",chunkIdList)
            console.log("chunkIdList!.length",chunkIdList.length)
        
            let chunkRecvPromise: Array<any> = []
        
            for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                console.log("chunkIdList_i_ ", i)
                chunkRecvPromise.push(new Promise(async (v) => {
                    setTimeout(() => {
                        v({ err: true, log: `ndn_service get_data timeout` })
                    }, timeout)
                    let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                    console.info(`开始传输chunk：${chunkId},${buff}`)
                    let req: cyfs.NDNGetDataOutputRequest = {
                        common: {
                            // api级别
                            level: level,
                            target: source.local_device_id().object_id,
                            // 需要处理数据的关联对象，主要用以chunk/file等
                            referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)],
                            flags: 0,
                        },
                        // 目前只支持ChunkId/FileId/DirId
                        object_id: chunkId.calculate_id(),
                    }
                    let begin = Date.now();
                    let resp = await source.ndn_service().get_data(req)
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
            })
            it("get_data,chunk对象,不同zone不同dec,访问来源objectmap+inner_path,权限验证",async()=>{
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()
        
                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()
        
                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()
        
                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()
        
                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()
        
                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\chunk_source\\11111.txt"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000
            
            console.info('开始chunk 传输流程 get_data')
            //console.info(`source:${source.local_device_id} target:${target.local_device_id()}`)
            //1. source 设备 publish_file 将文件存放到本地NDC 
            let owner = source.local_device().desc().owner()!.unwrap()
            let publish_file_time = Date.now();
            const file_resp_0 = (await source.trans().publish_file({
                common: {
                    level: level,
                    flags: 0,
                    dec_id: basDecIdA,
                    req_path: "",
                    referer_object: []
        
                },
                owner:owner,
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
                object_id: file_resp.file_id,
                //inner_path: '/11111.txt'
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
            let chunkIdList = file.body_expect().content().chunk_list.chunk_in_list!
            console.log("chunkIdList",chunkIdList)
            console.log("chunkIdList!.length",chunkIdList.length)
        
            let chunkRecvPromise: Array<any> = []
        
            for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                console.log("chunkIdList_i_ ", i)
                chunkRecvPromise.push(new Promise(async (v) => {
                    setTimeout(() => {
                        v({ err: true, log: `ndn_service get_data timeout` })
                    }, timeout)
                    let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                    console.info(`开始传输chunk：${chunkId},${buff}`)
                    let req: cyfs.NDNGetDataOutputRequest = {
                        common: {
                            // api级别
                            level: level,
                            target: source.local_device_id().object_id,
                            // 需要处理数据的关联对象，主要用以chunk/file等
                            referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)],
                            flags: 0,
                        },
                        // 目前只支持ChunkId/FileId/DirId
                        object_id: chunkId.calculate_id(),
                    }
                    let begin = Date.now();
                    let resp = await source.ndn_service().get_data(req)
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
            })
            it("get_data,chunk对象,同zone同dec,访问来源objectmap+inner_path,无req_path,传输权限验证",async()=>{
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()
        
                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()
        
                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()
        
                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()
        
                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()
        
                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\chunk_source\\11111.txt"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000
            
            console.info('开始chunk 传输流程 get_data')
            //console.info(`source:${source.local_device_id} target:${target.local_device_id()}`)
            //1. source 设备 publish_file 将文件存放到本地NDC 
            let owner = source.local_device().desc().owner()!.unwrap()
            let publish_file_time = Date.now();
            const file_resp_0 = (await source.trans().publish_file({
                common: {
                    level: level,
                    flags: 0,
                    dec_id: basDecIdA,
                    req_path: "",
                    referer_object: []
        
                },
                owner:owner,
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
                object_id: file_resp.file_id,
                //inner_path: '/11111.txt'
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
            let chunkIdList = file.body_expect().content().chunk_list.chunk_in_list!
            console.log("chunkIdList",chunkIdList)
            console.log("chunkIdList!.length",chunkIdList.length)
        
            let chunkRecvPromise: Array<any> = []
        
            for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                console.log("chunkIdList_i_ ", i)
                chunkRecvPromise.push(new Promise(async (v) => {
                    setTimeout(() => {
                        v({ err: true, log: `ndn_service get_data timeout` })
                    }, timeout)
                    let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                    console.info(`开始传输chunk：${chunkId},${buff}`)
                    let req: cyfs.NDNGetDataOutputRequest = {
                        common: {
                            // api级别
                            level: level,
                            target: source.local_device_id().object_id,
                            // 需要处理数据的关联对象，主要用以chunk/file等
                            referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)],
                            flags: 0,
                        },
                        // 目前只支持ChunkId/FileId/DirId
                        object_id: chunkId.calculate_id(),
                    }
                    let begin = Date.now();
                    let resp = await source.ndn_service().get_data(req)
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
            })
            it("get_data,chunk对象,同zone不同dec,访问来源objectmap+inner_path,无req_path,传输权限验证",async()=>{
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()
        
                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()
        
                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()
        
                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()
        
                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()
        
                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\chunk_source\\11111.txt"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000
            
            console.info('开始chunk 传输流程 get_data')
            //console.info(`source:${source.local_device_id} target:${target.local_device_id()}`)
            //1. source 设备 publish_file 将文件存放到本地NDC 
            let owner = source.local_device().desc().owner()!.unwrap()
            let publish_file_time = Date.now();
            const file_resp_0 = (await source.trans().publish_file({
                common: {
                    level: level,
                    flags: 0,
                    dec_id: basDecIdA,
                    req_path: "",
                    referer_object: []
        
                },
                owner:owner,
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
                object_id: file_resp.file_id,
                //inner_path: '/11111.txt'
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
            let chunkIdList = file.body_expect().content().chunk_list.chunk_in_list!
            console.log("chunkIdList",chunkIdList)
            console.log("chunkIdList!.length",chunkIdList.length)
        
            let chunkRecvPromise: Array<any> = []
        
            for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                console.log("chunkIdList_i_ ", i)
                chunkRecvPromise.push(new Promise(async (v) => {
                    setTimeout(() => {
                        v({ err: true, log: `ndn_service get_data timeout` })
                    }, timeout)
                    let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                    console.info(`开始传输chunk：${chunkId},${buff}`)
                    let req: cyfs.NDNGetDataOutputRequest = {
                        common: {
                            // api级别
                            level: level,
                            target: source.local_device_id().object_id,
                            // 需要处理数据的关联对象，主要用以chunk/file等
                            referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)],
                            flags: 0,
                        },
                        // 目前只支持ChunkId/FileId/DirId
                        object_id: chunkId.calculate_id(),
                    }
                    let begin = Date.now();
                    let resp = await source.ndn_service().get_data(req)
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
            })
            it("get_data,chunk对象,不同zone同dec,访问来源objectmap+inner_path,无req_path,传输权限验证",async()=>{
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()
        
                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()
        
                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()
        
                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()
        
                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()
        
                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\chunk_source\\11111.txt"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000
            
            console.info('开始chunk 传输流程 get_data')
            //console.info(`source:${source.local_device_id} target:${target.local_device_id()}`)
            //1. source 设备 publish_file 将文件存放到本地NDC 
            let owner = source.local_device().desc().owner()!.unwrap()
            let publish_file_time = Date.now();
            const file_resp_0 = (await source.trans().publish_file({
                common: {
                    level: level,
                    flags: 0,
                    dec_id: basDecIdA,
                    req_path: "",
                    referer_object: []
        
                },
                owner:owner,
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
                object_id: file_resp.file_id,
                //inner_path: '/11111.txt'
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
            let chunkIdList = file.body_expect().content().chunk_list.chunk_in_list!
            console.log("chunkIdList",chunkIdList)
            console.log("chunkIdList!.length",chunkIdList.length)
        
            let chunkRecvPromise: Array<any> = []
        
            for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                console.log("chunkIdList_i_ ", i)
                chunkRecvPromise.push(new Promise(async (v) => {
                    setTimeout(() => {
                        v({ err: true, log: `ndn_service get_data timeout` })
                    }, timeout)
                    let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                    console.info(`开始传输chunk：${chunkId},${buff}`)
                    let req: cyfs.NDNGetDataOutputRequest = {
                        common: {
                            // api级别
                            level: level,
                            target: source.local_device_id().object_id,
                            // 需要处理数据的关联对象，主要用以chunk/file等
                            referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)],
                            flags: 0,
                        },
                        // 目前只支持ChunkId/FileId/DirId
                        object_id: chunkId.calculate_id(),
                    }
                    let begin = Date.now();
                    let resp = await source.ndn_service().get_data(req)
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
            })
            it("get_data,chunk对象,不同zone不同dec,访问来源objectmap+inner_path,无req_path,传输权限验证",async()=>{
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()
        
                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()
        
                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()
        
                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()
        
                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()
        
                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\chunk_source\\11111.txt"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000
            
            console.info('开始chunk 传输流程 get_data')
            //console.info(`source:${source.local_device_id} target:${target.local_device_id()}`)
            //1. source 设备 publish_file 将文件存放到本地NDC 
            let owner = source.local_device().desc().owner()!.unwrap()
            let publish_file_time = Date.now();
            const file_resp_0 = (await source.trans().publish_file({
                common: {
                    level: level,
                    flags: 0,
                    dec_id: basDecIdA,
                    req_path: "",
                    referer_object: []
        
                },
                owner:owner,
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
                object_id: file_resp.file_id,
                //inner_path: '/11111.txt'
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
            let chunkIdList = file.body_expect().content().chunk_list.chunk_in_list!
            console.log("chunkIdList",chunkIdList)
            console.log("chunkIdList!.length",chunkIdList.length)
        
            let chunkRecvPromise: Array<any> = []
        
            for (let i = 0; i < chunkIdList!.length && i < chunkNumber; i++) {
                console.log("chunkIdList_i_ ", i)
                chunkRecvPromise.push(new Promise(async (v) => {
                    setTimeout(() => {
                        v({ err: true, log: `ndn_service get_data timeout` })
                    }, timeout)
                    let [chunkId, buff] = new cyfs.ChunkIdDecoder().raw_decode(chunkIdList[i].encode_to_buf().unwrap()).unwrap();
                    console.info(`开始传输chunk：${chunkId},${buff}`)
                    let req: cyfs.NDNGetDataOutputRequest = {
                        common: {
                            // api级别
                            level: level,
                            target: source.local_device_id().object_id,
                            // 需要处理数据的关联对象，主要用以chunk/file等
                            referer_object: [new cyfs.NDNDataRefererObject(undefined,file_resp.file_id)],
                            flags: 0,
                        },
                        // 目前只支持ChunkId/FileId/DirId
                        object_id: chunkId.calculate_id(),
                    }
                    let begin = Date.now();
                    let resp = await source.ndn_service().get_data(req)
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
            })
        })
        describe("#协议栈NONRequestor 内put_object接口",async()=>{
            it("get_data,file对象,同zone同dec,权限验证",async()=>{
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()

                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()

                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()

                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()

                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()

                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\file_source\\1.ts"
                let savePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\file_target\\1.ts"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000

                //1. source 设备 publish_file 将文件存放到本地NDC 
                let totalTime = 0;
                let begin = Date.now();
                let owner = source.local_device().desc().owner()!.unwrap()
                const file_resp_0 = (await source.trans().publish_file({
                    common: {
                        level: level,
                        flags: 0,
                        dec_id: basDecIdA,
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
            })
            it("get_data,file对象,同zone不同dec,权限验证",async()=>{
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()

                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()

                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()

                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()

                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()

                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\file_source\\1.ts"
                let savePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\file_target\\1.ts"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000

                //1. source 设备 publish_file 将文件存放到本地NDC 
                let totalTime = 0;
                let begin = Date.now();
                let owner = source.local_device().desc().owner()!.unwrap()
                const file_resp_0 = (await source.trans().publish_file({
                    common: {
                        level: level,
                        flags: 0,
                        dec_id: basDecIdA,
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
            })
            it("get_data,file对象,不同zone同dec,权限验证",async()=>{
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()

                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()

                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()

                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()

                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()

                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()


                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\file_source\\1.ts"
                let savePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\file_target\\1.ts"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000


                //1. source 设备 publish_file 将文件存放到本地NDC 
                let totalTime = 0;
                let begin = Date.now();
                let owner = source.local_device().desc().owner()!.unwrap()
                const file_resp_0 = (await source.trans().publish_file({
                    common: {
                        level: level,
                        flags: 0,
                        dec_id: basDecIdA,
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
            })
            it("get_data,file对象,不同zone不同dec,权限验证",async()=>{
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()

                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()

                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()

                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()

                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()

                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\file_source\\1.ts"
                let savePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\file_target\\1.ts"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000

                //1. source 设备 publish_file 将文件存放到本地NDC 
                let totalTime = 0;
                let begin = Date.now();
                let owner = source.local_device().desc().owner()!.unwrap()
                const file_resp_0 = (await source.trans().publish_file({
                    common: {
                        level: level,
                        flags: 0,
                        dec_id: basDecIdA,
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
            })
            it("get_data,file对象,同zone同dec,无req_path,权限验证",async()=>{
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()

                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()

                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()

                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()

                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()

                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\file_source\\1.ts"
                let savePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\file_target\\1.ts"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000

                //1. source 设备 publish_file 将文件存放到本地NDC 
                let totalTime = 0;
                let begin = Date.now();
                let owner = source.local_device().desc().owner()!.unwrap()
                const file_resp_0 = (await source.trans().publish_file({
                    common: {
                        level: level,
                        flags: 0,
                        dec_id: basDecIdA,
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
            })
            it("get_data,file对象,同zone不同dec,无req_path,权限验证",async()=>{
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()

                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()

                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()

                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()

                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()

                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\file_source\\1.ts"
                let savePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\file_target\\1.ts"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000

                //1. source 设备 publish_file 将文件存放到本地NDC 
                let totalTime = 0;
                let begin = Date.now();
                let owner = source.local_device().desc().owner()!.unwrap()
                const file_resp_0 = (await source.trans().publish_file({
                    common: {
                        level: level,
                        flags: 0,
                        dec_id: basDecIdA,
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
            })
            it("get_data,file对象,不同zone同dec,无req_path,权限验证",async()=>{
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()

                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()

                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()

                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()

                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()

                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()
                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\file_source\\1.ts"
                let savePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\file_target\\1.ts"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000

                //1. source 设备 publish_file 将文件存放到本地NDC 
                let totalTime = 0;
                let begin = Date.now();
                let owner = source.local_device().desc().owner()!.unwrap()
                const file_resp_0 = (await source.trans().publish_file({
                    common: {
                        level: level,
                        flags: 0,
                        dec_id: basDecIdA,
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
            })
            it("get_data,file对象,不同zone不同dec,无req_path,权限验证",async()=>{
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()

                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()

                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()

                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()

                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()

                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\file_source\\1.ts"
                let savePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\file_target\\1.ts"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000

                //1. source 设备 publish_file 将文件存放到本地NDC 
                let totalTime = 0;
                let begin = Date.now();
                let owner = source.local_device().desc().owner()!.unwrap()
                const file_resp_0 = (await source.trans().publish_file({
                    common: {
                        level: level,
                        flags: 0,
                        dec_id: basDecIdA,
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
        })
        describe("#协议栈NONRequestor 内put_object接口",async()=>{
            it("get_data,同zone同dec,objectmap+inner_path,取出file，传输权限验证",async()=>{
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()

                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()

                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()

                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()

                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()

                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\file_source\\1.ts"
                let savePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\file_target\\1.ts"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000

                //1. source 设备 publish_file 将文件存放到本地NDC 
                let totalTime = 0;
                let begin = Date.now();
                let owner = source.local_device().desc().owner()!.unwrap()
                const file_resp_0 = (await source.trans().publish_file({
                    common: {
                        level: level,
                        flags: 0,
                        dec_id: basDecIdA,
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
            })
            it("get_data,同zone不同dec,objectmap+inner_path,取出file，传输权限验证",async()=>{
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()

                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()

                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()

                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()

                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()

                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\file_source\\1.ts"
                let savePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\file_target\\1.ts"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000

                //1. source 设备 publish_file 将文件存放到本地NDC 
                let totalTime = 0;
                let begin = Date.now();
                let owner = source.local_device().desc().owner()!.unwrap()
                const file_resp_0 = (await source.trans().publish_file({
                    common: {
                        level: level,
                        flags: 0,
                        dec_id: basDecIdA,
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
            })
            it("get_data,不同zone同dec,objectmap+inner_path,取出file，传输权限验证",async()=>{
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()

                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()

                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()

                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()

                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()

                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\file_source\\1.ts"
                let savePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\file_target\\1.ts"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000

                //1. source 设备 publish_file 将文件存放到本地NDC 
                let totalTime = 0;
                let begin = Date.now();
                let owner = source.local_device().desc().owner()!.unwrap()
                const file_resp_0 = (await source.trans().publish_file({
                    common: {
                        level: level,
                        flags: 0,
                        dec_id: basDecIdA,
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
            })
            it("get_data,不同zone不同dec,objectmap+inner_path,取出file，传输权限验证",async()=>{
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()

                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()

                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()

                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()

                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()

                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()
                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\file_source\\1.ts"
                let savePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\file_target\\1.ts"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000

                //1. source 设备 publish_file 将文件存放到本地NDC 
                let totalTime = 0;
                let begin = Date.now();
                let owner = source.local_device().desc().owner()!.unwrap()
                const file_resp_0 = (await source.trans().publish_file({
                    common: {
                        level: level,
                        flags: 0,
                        dec_id: basDecIdA,
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
            })
            it("get_data,不同zone不同dec,objectmap+inner_path,取出file，无req_path,传输权限验证",async()=>{
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()

                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()

                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()

                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()

                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()

                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let filePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\file_source\\1.ts"
                let savePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\file_target\\1.ts"
                let chunkSize = 4 * 1024 * 1024
                let chunkNumber = 10
                let timeout: number = 600 * 1000

                //1. source 设备 publish_file 将文件存放到本地NDC 
                let totalTime = 0;
                let begin = Date.now();
                let owner = source.local_device().desc().owner()!.unwrap()
                const file_resp_0 = (await source.trans().publish_file({
                    common: {
                        level: level,
                        flags: 0,
                        dec_id: basDecIdA,
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
            })
        })
        describe("#协议栈NONRequestor 内put_object接口",async()=>{
            it("get_data,同zone同dec,objectmap+inner_path,取出dir，传输权限验证",async()=>{
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()

                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()

                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()

                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()

                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()

                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let dirPath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\dir_source"
                let savePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\dir_target"
                let chunkSize = 4 * 1024 * 1024

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
                        level: level,
                        flags: 0,
                        dec_id: basDecIdA,
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
                })  })
            })
            it("get_data,同zone不同dec,objectmap+inner_path,取出dir，传输权限验证",async()=>{
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()

                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()

                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()

                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()

                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()

                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let dirPath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\dir_source"
                let savePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\dir_target"
                let chunkSize = 4 * 1024 * 1024

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
                        level: level,
                        flags: 0,
                        dec_id: basDecIdA,
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
            })
            it("get_data,不同zone同dec,objectmap+inner_path,取出dir，传输权限验证",async()=>{
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()

                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()

                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()

                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()

                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()

                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let dirPath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\dir_source"
                let savePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\dir_target"
                let chunkSize = 4 * 1024 * 1024

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
                        level: level,
                        flags: 0,
                        dec_id: basDecIdA,
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
            })
            it("get_data,不同zone不同dec,objectmap+inner_path,取出dir，传输权限验证",async()=>{
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()

                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()

                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()

                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()

                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()

                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let dirPath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\dir_source"
                let savePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\dir_target"
                let chunkSize = 4 * 1024 * 1024

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
                        level: level,
                        flags: 0,
                        dec_id: basDecIdA,
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
            it("get_data,不同zone不同dec,objectmap+inner_path,取出dir，无req_path,传输权限验证",async()=>{
                const param1 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21000, 21001,basDecIdA).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const source = cyfs.SharedCyfsStack.open(param1);
                await source.online()

                
                const param11 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21002, 21003,basDecIdB).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const target = cyfs.SharedCyfsStack.open(param11);
                await target.online()

                const param12 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21004, 21005,basDecIdC).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device12 = cyfs.SharedCyfsStack.open(param12);
                await device12.online()

                const param2 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21010, 21011,basDecIdD).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const ood2 = cyfs.SharedCyfsStack.open(param2);
                await ood2.online()

                const param21 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21012, 21013,basDecIdE).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device21 = cyfs.SharedCyfsStack.open(param21);
                await device21.online()

                const param22 = cyfs.SharedCyfsStackParam.new_with_ws_event_ports(21014, 21015,basDecIdF).unwrap(); 
                param1.requestor_config = cyfs.SharedCyfsStackParam.default_requestor_config();
                const device22 = cyfs.SharedCyfsStack.open(param22);
                await device22.online()

                let level = cyfs.NDNAPILevel.NDC
                let dirPath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\dir_source"
                let savePath = "C:\\cyfs-stack-test-typescript\\TestSuite\\unittest_stack_interface\\dir_target"
                let chunkSize = 4 * 1024 * 1024

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
                        level: level,
                        flags: 0,
                        dec_id: basDecIdA,
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
            })
            })
        })
    })
})