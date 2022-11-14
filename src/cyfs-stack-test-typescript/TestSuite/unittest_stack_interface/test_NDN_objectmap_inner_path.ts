import * as fs from 'fs'
import assert = require('assert');
import * as cyfs from '../../cyfs_node/cyfs_node'
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
            it("get_data,chunk对象,同zone同dec,权限验证",async()=>{})
            it("get_data,chunk对象,同zone不同dec,权限验证",async()=>{})
            it("get_data,chunk对象,不同zone同dec,权限验证",async()=>{})
            it("get_data,chunk对象,不同zone不同dec,权限验证",async()=>{})
            it("get_data,chunk对象,同zone同dec,无req_path,权限验证",async()=>{})
            it("get_data,chunk对象,同zone不同dec,无req_path,权限验证",async()=>{})
            it("get_data,chunk对象,不同zone同dec,无req_path,权限验证",async()=>{})
            it("get_data,chunk对象,不同zone不同dec,无req_path,权限验证",async()=>{})
        })    
        describe("#协议栈NONRequestor 内put_object接口",async()=>{
            it("get_data,chunk对象,同zone同dec,chunk,访问来源file,权限验证",async()=>{})
            it("get_data,chunk对象,同zone不同dec,访问来源file,权限验证",async()=>{})
            it("get_data,chunk对象,不同zone同dec,访问来源file,权限验证",async()=>{})
            it("get_data,chunk对象,不同zone不同dec,访问来源file,权限验证",async()=>{})
            it("get_data,chunk对象,同zone同dec,chunk,访问来源file,无req_path,传输权限验证",async()=>{})
            it("get_data,chunk对象,同zone不同dec,访问来源file,无req_path,传输权限验证",async()=>{})
            it("get_data,chunk对象,不同zone同dec,访问来源file,无req_path,传输权限验证",async()=>{})
            it("get_data,chunk对象,不同zone不同dec,访问来源file,无req_path,传输权限验证",async()=>{})
        }) 
        describe("#协议栈NONRequestor 内put_object接口",async()=>{
            it("get_data,chunk对象,同zone同dec,访问来源dir,权限验证",async()=>{})
            it("get_data,chunk对象,同zone不同dec,访问来源dir,权限验证",async()=>{})
            it("get_data,chunk对象,不同zone同dec,访问来源dir,权限验证",async()=>{})
            it("get_data,chunk对象,不同zone不同dec,访问来源dir,权限验证",async()=>{})
            it("get_data,chunk对象,同zone同dec,访问来源dir,无req_path,权限验证",async()=>{})
            it("get_data,chunk对象,同zone不同dec,访问来源dir,无req_path,权限验证",async()=>{})
            it("get_data,chunk对象,不同zone同dec,访问来源dir,无req_path,权限验证",async()=>{})
            it("get_data,chunk对象,不同zone不同dec,访问来源dir,无req_path,权限验证",async()=>{})
        }) 
        describe("#协议栈NONRequestor 内put_object接口",async()=>{
            it("get_data,chunk对象,同zone同dec,访问来源objectmap+inner_path,权限验证",async()=>{})
            it("get_data,chunk对象,同zone不同dec,访问来源objectmap+inner_path,权限验证",async()=>{})
            it("get_data,chunk对象,不同zone同dec,访问来源objectmap+inner_path,权限验证",async()=>{})
            it("get_data,chunk对象,不同zone不同dec,访问来源objectmap+inner_path,权限验证",async()=>{})
            it("get_data,chunk对象,同zone同dec,访问来源objectmap+inner_path,无req_path,传输权限验证",async()=>{})
            it("get_data,chunk对象,同zone不同dec,访问来源objectmap+inner_path,无req_path,传输权限验证",async()=>{})
            it("get_data,chunk对象,不同zone同dec,访问来源objectmap+inner_path,无req_path,传输权限验证",async()=>{})
            it("get_data,chunk对象,不同zone不同dec,访问来源objectmap+inner_path,无req_path,传输权限验证",async()=>{})
        })
        describe("#协议栈NONRequestor 内put_object接口",async()=>{
            it("get_data,file对象,同zone同dec,权限验证",async()=>{})
            it("get_data,file对象,同zone不同dec,权限验证",async()=>{})
            it("get_data,file对象,不同zone同dec,权限验证",async()=>{})
            it("get_data,file对象,不同zone不同dec,权限验证",async()=>{})
            it("get_data,file对象,同zone同dec,无req_path,权限验证",async()=>{})
            it("get_data,file对象,同zone不同dec,无req_path,权限验证",async()=>{})
            it("get_data,file对象,不同zone同dec,无req_path,权限验证",async()=>{})
            it("get_data,file对象,不同zone不同dec,无req_path,权限验证",async()=>{})
        })
        describe("#协议栈NONRequestor 内put_object接口",async()=>{
            it("get_data,同zone同dec,objectmap+inner_path,取出file，传输权限验证",async()=>{})
            it("get_data,同zone不同dec,objectmap+inner_path,取出file，传输权限验证",async()=>{})
            it("get_data,不同zone同dec,objectmap+inner_path,取出file，传输权限验证",async()=>{})
            it("get_data,不同zone不同dec,objectmap+inner_path,取出file，传输权限验证",async()=>{})
            it("get_data,不同zone不同dec,objectmap+inner_path,取出file，无req_path,传输权限验证",async()=>{})
        })
        describe("#协议栈NONRequestor 内put_object接口",async()=>{
            it("get_data,同zone同dec,objectmap+inner_path,取出dir，传输权限验证",async()=>{})
            it("get_data,同zone不同dec,objectmap+inner_path,取出dir，传输权限验证",async()=>{})
            it("get_data,不同zone同dec,objectmap+inner_path,取出dir，传输权限验证",async()=>{})
            it("get_data,不同zone不同dec,objectmap+inner_path,取出dir，传输权限验证",async()=>{})
            it("get_data,不同zone不同dec,objectmap+inner_path,取出dir，无req_path,传输权限验证",async()=>{})
        })  
    })