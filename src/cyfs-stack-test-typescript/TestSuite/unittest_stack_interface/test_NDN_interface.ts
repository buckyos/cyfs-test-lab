import assert = require('assert');
import * as cyfs from "../../cyfs_node/cyfs_node"
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

describe("SharedCyfsStack util相关接口测试", function () {
    this.timeout(0);

    this.beforeAll(async function () {
        //测试前置条件，连接测试模拟器设备
        console.info(`##########用例执开始执行`);
        await ZoneSimulator.init();
        stack_runtime = ZoneSimulator.zone1_device1_stack!;
        stack_ood = ZoneSimulator.zone1_ood_stack!;

    })
    this.afterAll(async () => {
        //每个函数执行前，清除所有handler
        console.info(`#########用例执行完成`);
        ZoneSimulator.stopZoneSimulator();

    })
    let chunkId1: cyfs.ChunkId
    it("put_data 接口调用", async () => {
        let randomStr = RandomGenerator.string(1024 * 1024);
        let uint8Array: Uint8Array = stringToUint8Array(randomStr)
        let chunkId = cyfs.ChunkId.calculate(uint8Array);
        chunkId1 = chunkId.unwrap();
        console.info(`测试随机的chunkId 为：${chunkId}`)
        let rep: cyfs.NDNPutDataOutputRequest = {
            common: {
                // 请求路径，可为空
                req_path: "qaTest",
                // 来源DEC
                dec_id: ZoneSimulator.APPID,
                // api级别
                level: cyfs.NDNAPILevel.Router,
                // targrt设备参数目前无用
                target: stack_runtime.local_device_id().object_id,
                // 需要处理数据的关联对象，主要用以chunk/file等
                referer_object: [],
                flags: 1,
            },
            object_id: chunkId.unwrap().desc().calculate_id(),
            length: uint8Array.length,
            data: uint8Array,
        }
        //调用接口
        let resp = await stack_runtime.ndn_service().put_data(rep);
        console.info(`${resp}`)
        assert(!resp.err, `put_data 传输chunk失败`)
    })

    // put_data 用例补充
    it("put_data router级别target不指定设备", async () => {
        let randomStr = RandomGenerator.string(1024 * 1024);
        let uint8Array: Uint8Array = stringToUint8Array(randomStr)
        let chunkId = cyfs.ChunkId.calculate(uint8Array);
        console.info(`测试随机的chunkId 为：${chunkId}`)
        let resp = await stack_runtime.ndn_service().put_data({
            common: {
                // 请求路径，可为空
                req_path: "qaTest",
                // 来源DEC
                dec_id: ZoneSimulator.APPID,
                // api级别
                level: cyfs.NDNAPILevel.Router,
                // 需要处理数据的关联对象，主要用以chunk/file等
                target: undefined,
                referer_object: [],
                flags: 1,
            },
            object_id: chunkId.unwrap().desc().calculate_id(),
            length: uint8Array.length,
            data: uint8Array,
        })
        console.info(JSON.stringify(resp, null, 4))
        assert(resp.err, `put_data to target supported `)
    })

    it("put_data 请求路径为空", async () => {
        let randomStr = RandomGenerator.string(1024 * 1024);
        let uint8Array: Uint8Array = stringToUint8Array(randomStr)
        let chunkId = cyfs.ChunkId.calculate(uint8Array);
        console.info(`测试随机的chunkId 为：${chunkId}`)
        let rep: cyfs.NDNPutDataOutputRequest = {
            common: {
                // 请求路径，可为空
                req_path: undefined,
                // 来源DEC
                dec_id: ZoneSimulator.APPID,
                // api级别
                level: cyfs.NDNAPILevel.Router,
                // targrt设备参数目前无用
                target: stack_runtime.local_device_id().object_id,
                // 需要处理数据的关联对象，主要用以chunk/file等
                referer_object: [],
                flags: 1,
            },
            object_id: chunkId.unwrap().desc().calculate_id(),
            length: uint8Array.length,
            data: uint8Array,
        }
        //调用接口
        let resp = await stack_runtime.ndn_service().put_data(rep);
        console.info(`${resp}`)
        assert(!resp.err, `put_data 传输chunk失败`)
    })

    it("put_data 不定义应用id", async () => {
        let randomStr = RandomGenerator.string(1024 * 1024);
        let uint8Array: Uint8Array = stringToUint8Array(randomStr)
        let chunkId = cyfs.ChunkId.calculate(uint8Array);
        console.info(`测试随机的chunkId 为：${chunkId}`)
        let rep: cyfs.NDNPutDataOutputRequest = {
            common: {
                // 请求路径，可为空
                req_path: "",
                // 来源DEC
                dec_id: undefined,
                // api级别
                level: cyfs.NDNAPILevel.Router,
                // targrt设备参数目前无用
                target: stack_runtime.local_device_id().object_id,
                // 需要处理数据的关联对象，主要用以chunk/file等
                referer_object: [],
                flags: 1,
            },
            object_id: chunkId.unwrap().desc().calculate_id(),
            length: uint8Array.length,
            data: uint8Array,
        }
        //调用接口
        let resp = await stack_runtime.ndn_service().put_data(rep);
        console.info(`${resp}`)
        assert(!resp.err, `put_data 传输chunk失败`)
    })

    it("put_data NDN级别target为空默认本地", async () => {
        let randomStr = RandomGenerator.string(1024 * 1024);
        let uint8Array: Uint8Array = stringToUint8Array(randomStr)
        let chunkId = cyfs.ChunkId.calculate(uint8Array);
        console.info(`测试随机的chunkId 为：${chunkId}`)
        let rep: cyfs.NDNPutDataOutputRequest = {
            common: {
                // 请求路径，可为空
                req_path: "qaTest",
                // 来源DEC
                dec_id: ZoneSimulator.APPID,
                // api级别
                level: cyfs.NDNAPILevel.NDN,
                // targrt设备参数目前无用
                target: undefined,
                // 需要处理数据的关联对象，主要用以chunk/file等
                referer_object: [],
                flags: 1,
            },
            object_id: chunkId.unwrap().desc().calculate_id(),
            length: uint8Array.length,
            data: uint8Array,
        }
        //调用接口
        let resp = await stack_runtime.ndn_service().put_data(rep);
        console.info(`${resp}`)
        assert(!resp.err, `put_data 传输chunk失败`)
    })

    it("put_data 传入空字符生成的chunk", async () => {
        let randomStr = RandomGenerator.string(0);
        let uint8Array: Uint8Array = stringToUint8Array(randomStr)
        let chunkId = cyfs.ChunkId.calculate(uint8Array);
        console.info(`测试随机的chunkId 为：${chunkId}`)
        let rep: cyfs.NDNPutDataOutputRequest = {
            common: {
                // 请求路径，可为空
                req_path: "qaTest",
                // 来源DEC
                dec_id: ZoneSimulator.APPID,
                // api级别
                level: cyfs.NDNAPILevel.NDN,
                // targrt设备参数目前无用
                target: undefined,
                // 需要处理数据的关联对象，主要用以chunk/file等
                referer_object: [],
                flags: 1,
            },
            object_id: chunkId.unwrap().desc().calculate_id(),
            length: uint8Array.length,
            data: uint8Array,
        }
        //调用接口
        let resp = await stack_runtime.ndn_service().put_data(rep);
        console.info(`${resp}`)
        assert(!resp.err, `put_data 传输chunk失败`)
    })

    it("put_data  空字符对象的chunk", async () => {
        // let randomStr = RandomGenerator.string(0);
        // console.log("--------------------------"+randomStr)


        let chunkId = cyfs.ChunkId.calculate(new Uint8Array());
        console.log("--------------------------" + chunkId)

        chunkId1 = chunkId.unwrap();
        console.info(`测试随机的chunkId 为：${chunkId}`)
        let rep: cyfs.NDNPutDataOutputRequest = {
            common: {
                // 请求路径，可为空
                req_path: "qaTest",
                // 来源DEC
                dec_id: ZoneSimulator.APPID,
                // api级别
                level: cyfs.NDNAPILevel.NDN,
                // targrt设备参数目前无用
                target: undefined,
                // 需要处理数据的关联对象，主要用以chunk/file等
                referer_object: [],
                flags: 1,
            },
            object_id: chunkId.unwrap().desc().calculate_id(),
            length: Uint8Array.length,
            data: new Uint8Array,
        }
        //调用接口
        let resp = await stack_runtime.ndn_service().put_data(rep);
        console.info(`${resp}`)
        assert(!resp.err, `put_data 传输chunk失败`)
    })

    it("get_data接口调用", async () => {
        //（1）连接模拟器协议栈
        //（2）构造接口测试数据 
        let rep2: cyfs.NDNGetDataOutputRequest = {
            common: {
                // 请求路径，可为空
                req_path: "qaTest",
                // 来源DEC
                dec_id: ZoneSimulator.APPID,
                // api级别
                level: cyfs.NDNAPILevel.Router,
                // targrt设备参数
                target: stack_runtime.local_device_id().object_id,
                // 需要处理数据的关联对象，主要用以chunk/file等
                referer_object: [],
                flags: 1,
            },
            object_id: chunkId1.calculate_id(),
            inner_path: `qaTest`,
        }
        //调用接口
        let resp = await stack_ood.ndn_service().get_data(rep2);
        console.info(`${resp}`)
        assert(!resp.err, `get_data 传输chunk失败`)

    })
    //get_data用例补充
    it("get_data 无请求路径", async () => {
        //（1）连接模拟器协议栈
        //（2）构造接口测试数据 
        let rep2: cyfs.NDNGetDataOutputRequest = {
            common: {
                // 请求路径，可为空
                // 来源DEC
                dec_id: ZoneSimulator.APPID,
                // api级别
                level: cyfs.NDNAPILevel.Router,
                // targrt设备参数
                target: stack_runtime.local_device_id().object_id,
                // 需要处理数据的关联对象，主要用以chunk/file等
                referer_object: [],
                flags: 1,
            },
            object_id: chunkId1.calculate_id(),
            inner_path: `qaTest`,
        }
        //调用接口
        let resp = await stack_ood.ndn_service().get_data(rep2);
        console.info(`${resp}`)
        assert(!resp.err, `get_data 传输chunk失败`)

    })
    it("get_data 无dec id", async () => {
        //（1）连接模拟器协议栈
        //（2）构造接口测试数据 
        let rep2: cyfs.NDNGetDataOutputRequest = {
            common: {
                // 请求路径，可为空
                req_path: "",
                // 来源DEC
                // api级别
                level: cyfs.NDNAPILevel.Router,
                // targrt设备参数
                target: stack_runtime.local_device_id().object_id,
                // 需要处理数据的关联对象，主要用以chunk/file等
                referer_object: [],
                flags: 1,
            },
            object_id: chunkId1.calculate_id(),
            inner_path: `qaTest`,
        }
        //调用接口
        let resp = await stack_ood.ndn_service().get_data(rep2);
        console.info(`${resp}`)
        assert(!resp.err, `get_data 传输chunk失败`)

    })
    it("get_data 无target指定", async () => {
        //（1）连接模拟器协议栈
        //（2）构造接口测试数据 
        let rep2: cyfs.NDNGetDataOutputRequest = {
            common: {
                // 请求路径，可为空
                req_path: "",
                // 来源DEC
                dec_id: ZoneSimulator.APPID,
                // api级别
                level: cyfs.NDNAPILevel.Router,
                // targrt设备参数
                // 需要处理数据的关联对象，主要用以chunk/file等
                referer_object: [],
                flags: 1,
            },
            object_id: chunkId1.calculate_id(),
            inner_path: `qaTest`,
        }
        //调用接口
        let resp = await stack_ood.ndn_service().get_data(rep2);
        console.info(`${resp}`)
        assert(resp.err, `未指定target成功了`)

    })
    it("get_data 空字符对象的chunk", async () => {
        //（1）连接模拟器协议栈
        //（2）构造接口测试数据 
        let chunkId = cyfs.ChunkId.calculate(new Uint8Array());

        let rep2: cyfs.NDNGetDataOutputRequest = {
            common: {
                // 请求路径，可为空
                req_path: "",
                // 来源DEC
                dec_id: ZoneSimulator.APPID,
                // api级别
                level: cyfs.NDNAPILevel.Router,
                // targrt设备参数
                target: stack_runtime.local_device_id().object_id,
                // 需要处理数据的关联对象，主要用以chunk/file等
                referer_object: [],
                flags: 1,
            },
            object_id: chunkId.unwrap().desc().calculate_id(),
            inner_path: `qaTest`,
        }
        //调用接口
        let resp = await stack_ood.ndn_service().get_data(rep2);
        console.info(JSON.stringify(resp, null, 4))
        assert(!resp.err, `get_data 传输chunk失败`)

    })

    it("delete_data接口调用", async () => {
        //（1）连接模拟器协议栈
        //（2）构造接口测试数据 
        let rep2: cyfs.NDNDeleteDataOutputRequest = {
            common: {
                // 请求路径，可为空
                req_path: "qaTest",
                // 来源DEC
                dec_id: ZoneSimulator.APPID,
                // api级别
                level: cyfs.NDNAPILevel.Router,
                // targrt设备参数
                target: stack_runtime.local_device_id().object_id,
                // 需要处理数据的关联对象，主要用以chunk/file等
                referer_object: [],
                flags: 1,
            },
            object_id: chunkId1.calculate_id(),
            inner_path: `qaTest`,
        }
        //调用接口
        let resp = await stack_ood.ndn_service().delete_data(rep2);
        console.info(JSON.stringify(resp, null, 4))
        assert(resp.err, `delete_data 传输chunk失败`)

    })
    //delete_data 补充用例
    it("delete_data 无请求路径", async () => {
        //（1）连接模拟器协议栈
        //（2）构造接口测试数据 
        let rep2: cyfs.NDNDeleteDataOutputRequest = {
            common: {
                // 请求路径，可为空
                // 来源DEC
                dec_id: ZoneSimulator.APPID,
                // api级别
                level: cyfs.NDNAPILevel.Router,
                // targrt设备参数
                target: stack_runtime.local_device_id().object_id,
                // 需要处理数据的关联对象，主要用以chunk/file等
                referer_object: [],
                flags: 1,
            },
            object_id: chunkId1.calculate_id(),
            inner_path: `qaTest`,
        }
        //调用接口
        let resp = await stack_ood.ndn_service().delete_data(rep2);
        console.info(JSON.stringify(resp, null, 4))
        assert(resp.err, `delete_data 传输chunk失败`)

    })
    it("delete_data 无dec id", async () => {
        //（1）连接模拟器协议栈
        //（2）构造接口测试数据 
        let rep2: cyfs.NDNDeleteDataOutputRequest = {
            common: {
                // 请求路径，可为空
                req_path: "qaTest",
                // 来源DEC
                // api级别
                level: cyfs.NDNAPILevel.Router,
                // targrt设备参数
                target: stack_runtime.local_device_id().object_id,
                // 需要处理数据的关联对象，主要用以chunk/file等
                referer_object: [],
                flags: 1,
            },
            object_id: chunkId1.calculate_id(),
            inner_path: `qaTest`,
        }
        //调用接口
        let resp = await stack_ood.ndn_service().delete_data(rep2);
        console.info(JSON.stringify(resp, null, 4))
        assert(resp.err, `delete_data 传输chunk失败`)

    })
    it("delete_data 无target指定", async () => {
        //（1）连接模拟器协议栈
        //（2）构造接口测试数据 
        let rep2: cyfs.NDNDeleteDataOutputRequest = {
            common: {
                // 请求路径，可为空
                req_path: "qaTest",
                // 来源DEC
                dec_id: ZoneSimulator.APPID,
                // api级别
                level: cyfs.NDNAPILevel.Router,
                // targrt设备参数
                // 需要处理数据的关联对象，主要用以chunk/file等
                referer_object: [],
                flags: 1,
            },
            object_id: chunkId1.calculate_id(),
            inner_path: `qaTest`,
        }
        //调用接口
        let resp = await stack_ood.ndn_service().delete_data(rep2);
        console.info(JSON.stringify(resp, null, 4))
        assert(resp.err, `delete_data 传输chunk失败`)

    })
    it("delete_data 空字符对象的chunk", async () => {
        //（1）连接模拟器协议栈
        //（2）构造接口测试数据 
        let chunkId = cyfs.ChunkId.calculate(new Uint8Array());

        let rep2: cyfs.NDNDeleteDataOutputRequest = {
            common: {
                // 请求路径，可为空
                req_path: "qaTest",
                // 来源DEC
                dec_id: ZoneSimulator.APPID,
                // api级别
                level: cyfs.NDNAPILevel.Router,
                // targrt设备参数
                target: stack_runtime.local_device_id().object_id,
                // 需要处理数据的关联对象，主要用以chunk/file等
                referer_object: [],
                flags: 1,
            },
            object_id: chunkId.unwrap().desc().calculate_id(),
            inner_path: `qaTest`,
        }
        //调用接口
        let resp = await stack_ood.ndn_service().delete_data(rep2);
        console.info(JSON.stringify(resp, null, 4))
        assert(resp.err, `delete_data 传输chunk失败`)

    })


    it("query_file 接口调用", async () => {
        let fileName = RandomGenerator.string(10);
        let filePath = path.join(__dirname, "../../test_cache_file/source")
        let file = await RandomGenerator.createRandomFile(filePath, fileName, 10 * 1024 * 1024);
        let add_file = await stack_runtime.trans().publish_file({
            common: {// 请求路径，可为空
                req_path: "qaTest",
                // 来源DEC
                dec_id: ZoneSimulator.APPID,
                // api级别
                level: cyfs.NDNAPILevel.Router,
                // targrt设备参数
                target: stack_runtime.local_device_id().object_id,
                // 需要处理数据的关联对象，主要用以chunk/file等
                referer_object: [],
                flags: 1,
            },
            owner: cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap(),
            local_path: path.join(filePath, fileName),
            chunk_size: 4 * 1024 * 1024
        })
        let file_id = add_file.unwrap().file_id;

        let task = await stack_runtime.trans().create_task({
            common: {
                req_path: "qaTest",
                dec_id: ZoneSimulator.APPID,
                level: cyfs.NDNAPILevel.NDN,
                target: stack_runtime.local_device_id().object_id,
                referer_object: [],
                flags: 1,
            },
            object_id: file_id,
            local_path: path.join(filePath, fileName),
            device_list: [stack_ood.local_device_id()],
            auto_start: true,
        })
        console.info(`file_id: ${file_id}`)
        await cyfs.sleep(5 * 1000)
        let rep2: cyfs.NDNQueryFileOutputRequest = {
            common: {
                // 请求路径，可为空
                req_path: "qaTest",
                // 来源DEC
                dec_id: ZoneSimulator.APPID,
                // api级别
                level: cyfs.NDNAPILevel.NDN,
                // targrt设备参数
                target: stack_runtime.local_device_id().object_id,
                // 需要处理数据的关联对象，主要用以chunk/file等
                referer_object: [],
                flags: 1,
            },
            param: {
                type: cyfs.NDNQueryFileParamType.File,
                file_id: file_id

            }
        }
        //调用接口
        console.info(JSON.stringify(rep2, null, 4));
        let resp = await stack_runtime.ndn_service().query_file(rep2);
        console.info(JSON.stringify(resp, null, 4))
        assert(!resp.err, `delete_data 传输chunk失败`)

    })
    //query_file 补充用例
    it.only("query_file 不定义fileid", async () => {
        let fileName = RandomGenerator.string(10);
        let filePath = path.join(__dirname, "../../test_cache_file/source")
        let file = await RandomGenerator.createRandomFile(filePath, fileName, 10 * 1024 * 1024);
        let add_file = await stack_runtime.trans().publish_file({
            common: {// 请求路径，可为空
                req_path: "qaTest",
                // 来源DEC
                dec_id: ZoneSimulator.APPID,
                // api级别
                level: cyfs.NDNAPILevel.Router,
                // targrt设备参数
                target: stack_runtime.local_device_id().object_id,
                // 需要处理数据的关联对象，主要用以chunk/file等
                referer_object: [],
                flags: 1,
            },
            owner: cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap(),
            local_path: path.join(filePath, fileName),
            chunk_size: 4 * 1024 * 1024
        })
        let file_id = add_file.unwrap().file_id;

        // let task = await stack_runtime.trans().create_task({
        //     common: {
        //         req_path: "qaTest",
        //         dec_id: ZoneSimulator.APPID,
        //         level: cyfs.NDNAPILevel.NDN,
        //         target: stack_runtime.local_device_id().object_id,
        //         referer_object: [],
        //         flags: 1,
        //     },
        //     object_id: file_id,
        //     local_path: path.join(filePath, fileName),
        //     device_list: [stack_ood.local_device_id()],
        //     auto_start: true,
        // })
        console.info(`file_id: ${file_id}`)
        await cyfs.sleep(5 * 1000)
        let rep2: cyfs.NDNQueryFileOutputRequest = {
            common: {
                // 请求路径，可为空
                req_path: "qaTest",
                // 来源DEC
                dec_id: ZoneSimulator.APPID,
                // api级别
                level: cyfs.NDNAPILevel.NDN,
                // targrt设备参数
                target: stack_runtime.local_device_id().object_id,
                // 需要处理数据的关联对象，主要用以chunk/file等
                referer_object: [],
                flags: 1,
            },
            param: {
                type: cyfs.NDNQueryFileParamType.File,
                file_id: file_id
            }
        }
        //调用接口
        console.info(JSON.stringify(rep2, null, 4));
        let resp = await stack_runtime.ndn_service().query_file(rep2);
        console.info(JSON.stringify(resp, null, 4))
        assert(!resp.err, `delete_data 传输chunk失败`)

    })

})