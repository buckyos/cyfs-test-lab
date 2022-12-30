import assert = require('assert');
import * as cyfs from '../../cyfs_node';
import { ZoneSimulator, stringToUint8Array, RandomGenerator, all_stacks, getStack, Ready, getDecId, all_dec_id, chunk_mode } from "../../common";
import * as path from 'path';
//初始化日志
cyfs.clog.enable_file_log({
    name: "unittest_stack_interface",
    dir: cyfs.get_app_log_dir("unittest_stack_interface"),
    file_max_size: 1024 * 1024 * 10,
    file_max_count: 10,
});

async function putData(size: number = 10, sstack: cyfs.SharedCyfsStack, sdecid: cyfs.ObjectId | undefined, reqpath: string | undefined) {
    let randomStr = RandomGenerator.string(size * 1024);
    console.log("-_----------------------------->" + Buffer.byteLength(randomStr))
    let uint8Array: Uint8Array = stringToUint8Array(randomStr)
    let chunkId = cyfs.ChunkId.calculate(uint8Array).unwrap();
    console.info(`测试随机的chunkId 为：${chunkId}`)

    let req_path
    if (reqpath) {
        let stub = ZoneSimulator.zone1_device1_stack.root_state_stub(ZoneSimulator.zone1_device1_stack.local_device_id().object_id, ZoneSimulator.zone1_device1_stack.dec_id);
        let op_env = (await stub.create_path_op_env()).unwrap()
        await op_env.set_with_path(reqpath!, chunkId.calculate_id(), undefined, true)
        let o = (await op_env.commit()).unwrap()
        req_path = new cyfs.RequestGlobalStatePath(ZoneSimulator.zone1_device1_stack.dec_id, reqpath).toString()
        console.log("------------------------> " + req_path)
    }

    let rep: cyfs.NDNPutDataOutputRequest = {
        common: {
            // 请求路径，可为空
            req_path: req_path,
            // 来源DEC
            dec_id: sdecid,
            // api级别
            level: cyfs.NDNAPILevel.Router,
            // targrt设备参数目前无用
            target: sstack.local_device_id().object_id,
            // 需要处理数据的关联对象，主要用以chunk/file等
            referer_object: [],
            flags: 1,
        },
        object_id: chunkId.desc().calculate_id(),
        length: uint8Array.length,
        data: uint8Array,
    }
    //调用接口
    let resp = await sstack.ndn_service().put_data(rep);
    console.info(`${resp}`)
    assert(!resp.err, `put_data 传输chunk失败`)
    return { chunkId, req_path }
}

async function controlPathAccess(sstack: cyfs.SharedCyfsStack, tstack: cyfs.SharedCyfsStack, tdec_id: cyfs.ObjectId, rpath: string, access: cyfs.AccessString, remove?: boolean) {
    //给指定设备dec授权该path,不指定默认当前source
    // let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("test_nDn", cyfs.AccessString.default())
    // await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)
    let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new(rpath, access)
    if (remove) {
        await sstack.root_state_meta_stub(tstack.local_device_id().object_id, tdec_id).remove_access(item)
    } else { await sstack.root_state_meta_stub(tstack.local_device_id().object_id, tdec_id).add_access(item) }
}

let zone1device1: cyfs.SharedCyfsStack
let zone1device2: cyfs.SharedCyfsStack
let zone1ood: cyfs.SharedCyfsStack


let zone1device1_dec_id: cyfs.ObjectId
let zone1device2_dec_id: cyfs.ObjectId

let zone2device1: cyfs.SharedCyfsStack
let zone2device1_dec_id: cyfs.ObjectId

describe("SharedCyfsStack NDN相关接口测试", function () {
    this.timeout(0);

    this.beforeAll(async function () {
        //测试前置条件，连接测试模拟器设备
        console.info(`##########用例执开始执行`);
        await ZoneSimulator.init();
        zone1device1 = getStack(all_stacks.zone1_device1)
        zone1device2 = getStack(all_stacks.zone1_device2)
        zone1ood = getStack(all_stacks.zone1ood)

        zone1device1_dec_id = getDecId(all_dec_id.zone1device1_decid)
        zone1device2_dec_id = getDecId(all_dec_id.zone1device2_decid)

        zone2device1 = getStack(all_stacks.zone2_device1)
        zone2device1_dec_id = getDecId(all_dec_id.zone2device1_decid)


    })
    this.afterAll(async () => {
        console.info(`#########用例执行完成`);
        ZoneSimulator.stopZoneSimulator();
    })

    describe("同zone同dec", function () {
        this.beforeEach(async function () { await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).clear_access() })
        it("getData chunk目标对象 —— —— 获取成功", async () => {
            let { chunkId } = await putData(10, zone1device1, undefined, undefined)
            let rep2: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: undefined,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep2);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)


        })
        it("getData chunk目标对象 —— reqPath 获取成功", async () => {
            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()
            let chunkId = chunkIdList![0]

            let rep2: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep2);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联file —— 有file对象权限&相应chunck 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "file", cyfs.AccessString.full()).then()
            let chunkId = chunkIdList![0]
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        undefined,
                        file_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联file —— 有file对象权限&非相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-chunk").then()
            let { chunkId } = await putData(10, zone1device1, undefined, undefined)

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        undefined,
                        file_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 获取关联非相应chunk居然成功了`)
        })
        it("getData chunk目标对象 关联file —— 无file对象权限&相应chunck 获取失败", async () => {
            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "file", new cyfs.AccessString(0o000)).then()
            let chunkId = chunkIdList![0]
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        undefined,
                        file_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })

        it("getData chunk目标对象 关联file reqPath 有该path权限&相应chunck 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-chunk", "file", cyfs.AccessString.full()).then()

            let chunkId = chunkIdList![0]
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("/test_nDn", cyfs.AccessString.default())
            await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        file_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联file reqPath 无该path权限&相应chunck 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file", "file", cyfs.AccessString.default()).then()
            let chunkId = chunkIdList![0]
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("/test_nDn", cyfs.AccessString.default())
            await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).remove_access(item)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        undefined,
                        file_id.object_id)]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联file reqPath 有该path权限&非相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024, cyfs.NDNAPILevel.Router, "mount-file", "file", cyfs.AccessString.full()).then()

            let { chunkId } = await putData(10, zone1device1, undefined, undefined)
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("test_nDn", cyfs.AccessString.default())
            await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        undefined,
                        file_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })


        it("getData chunk目标对象 关联dir+innerPath  有该dir权限&相应chunck 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

            let chunkId = chunkIdList![0]
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联dir+innerpath  有该dir权限&非相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

            let { chunkId } = await putData(10, zone1device1, undefined, undefined)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联dir+innerPath  无该dir权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", new cyfs.AccessString(0o000)).then()

            let chunkId = chunkIdList![0]
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })

        it("getData chunk目标对象 关联dir+innerpath reqPath 有该path权限&相应chunck 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()

            let chunkId = chunkIdList![0]

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联dir+innerpath reqPath 有该path权限&非相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024, cyfs.NDNAPILevel.Router, "mount-file").then()

            let { chunkId } = await putData(10, zone1device1, undefined, undefined)

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 无权限 获取成功`)

        })
        it("getData chunk目标对象 关联dir+innerPath reqPath 无该path权限&相应chunck 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir", "dir", cyfs.AccessString.default()).then()

            let chunkId = chunkIdList![0]

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })


        it("getData file目标对象 —— —— 有file对象权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: []
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData file目标对象 —— —— 无file对象权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "file", new cyfs.AccessString(0o000)).then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: []
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it("getData file目标对象 —— reqPath 有path对象权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file").then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: []
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData file目标对象 —— reqPath 无path对象权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file").then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: []
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })

        it("getData file目标对象 关联dir+innerPath —— 有dir对象权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path)]
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData file目标对象 关联dir+innerPath —— 无dir对象权限 获取失败", async () => {
            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", new cyfs.AccessString(0o000)).then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path)]
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it("getData file目标对象 关联dir+innerPath reqpath 有该path权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()

            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("/test_nDn", cyfs.AccessString.default())
            await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path)]
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData file目标对象 关联dir+innerPath reqpath 无path权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir", "dir", cyfs.AccessString.default()).then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path)]
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })

        it("getData dir+innerPath目标对象 —— —— 有dir对象权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                object_id: dir_id.object_id,
                inner_path: inner_path,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData dir+innerPath目标对象 —— —— 无dir对象权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", new cyfs.AccessString(0o000)).then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                object_id: dir_id.object_id,
                inner_path: inner_path,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it("getData dir+innerPath目标对象 —— reqpath 有path权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()


            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("/test_nDn", cyfs.AccessString.default())
            await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                object_id: dir_id.object_id,
                inner_path: inner_path,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData dir+innerPath目标对象 —— reqpath 无path权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir", "dir", cyfs.AccessString.default()).then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                object_id: dir_id.object_id,
                inner_path: inner_path,
            }

            console.info(`请求信息-=-=-= {"common": {"req_path": ${rep.common.req_path?.toString()},
            "dec_id": ${rep.common.dec_id?.toString()},"level": ${rep.common.level?.toString()},"target": ${rep.common.target?.toString()},
            "referer_object": ${rep.common.referer_object?.toString()},"flags":${rep.common.flags?.toString()}},
            "object_id": ${rep.object_id.toString()}, "inner_path": ${rep.inner_path?.toString()}}`)

            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })

        it.skip("delete_data接口调用", async () => {
            let { chunkId } = await putData(10, zone1device1, undefined, undefined)

            let rep2: cyfs.NDNDeleteDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: "qaTest",
                    // 来源DEC
                    dec_id: ZoneSimulator.APPID,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: `qaTest`,
            }
            //调用接口
            let resp = await zone1ood.ndn_service().delete_data(rep2);
            console.info(JSON.stringify(resp, null, 4))
            assert(resp.err, `delete_data 传输chunk失败`)

        })

        it("同zone同dec query_file 接口调用", async () => {
            let fileName = RandomGenerator.string(10);
            let filePath = path.join(__dirname, "../../test_cache_file/source")
            let file = await RandomGenerator.createRandomFile(filePath, fileName, 10 * 1024 * 1024);
            let add_file = await zone1device1.trans().publish_file({
                common: {// 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                owner: cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap(),
                local_path: path.join(filePath, fileName),
                chunk_size: 4 * 1024 * 1024
            })
            let file_id = add_file.unwrap().file_id;

            let task = await zone1device1.trans().create_task({
                common: {
                    req_path: undefined,
                    dec_id: zone1device1_dec_id,
                    level: cyfs.NDNAPILevel.NDN,
                    target: zone1device1.local_device_id().object_id,
                    referer_object: [],
                    flags: 1,
                },
                object_id: file_id,
                local_path: path.join(filePath, fileName),
                device_list: [zone1device1.local_device_id()],
                auto_start: true,
            })
            console.info(`file_id: ${file_id}`)
            await cyfs.sleep(5 * 1000)
            let rep2: cyfs.NDNQueryFileOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.NDN,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
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
            let resp = await zone1device1.ndn_service().query_file(rep2);
            console.info(JSON.stringify(resp, null, 4))
            assert(!resp.err, `queryfile 调用失败`)

        })

        it("query_file 不定义fileid", async () => {
            let fileName = RandomGenerator.string(10);
            let filePath = path.join(__dirname, "../../test_cache_file/source")
            let file = await RandomGenerator.createRandomFile(filePath, fileName, 10 * 1024 * 1024);
            let add_file = await zone1device1.trans().publish_file({
                common: {// 请求路径，可为空
                    req_path: "qaTest",
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                owner: cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap(),
                local_path: path.join(filePath, fileName),
                chunk_size: 4 * 1024 * 1024
            })
            let file_id = add_file.unwrap().file_id;


            console.info(`file_id: ${file_id}`)
            await cyfs.sleep(5 * 1000)
            let rep2: cyfs.NDNQueryFileOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: "qaTest",
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.NDN,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
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
            let resp = await zone1device1.ndn_service().query_file(rep2);
            console.info(JSON.stringify(resp, null, 4))
            assert(!resp.err, `delete_data 传输chunk失败`)

        })
    })

    describe("同zone跨dec", function () {
        this.beforeEach(async function () { await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).clear_access() })

        it("getData chunk目标对象 —— —— 获取成功", async () => {
            let { chunkId } = await putData(10, zone1device1, undefined, undefined)
            let rep2: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep2);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })

        it("getData chunk目标对象 —— reqPath 有该path权限&validate一致 获取成功", async () => {
            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-chunk").then()
            let chunkId = chunkIdList![0]
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("test_nDn", cyfs.AccessString.default())
            await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)

            let rep2: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep2);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 获取chunk失败`)

        })

        it("getData chunk目标对象 关联file —— 有file对象权限&相应chunck 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()
            let chunkId = chunkIdList![0]
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        undefined,
                        file_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联file —— 有file对象权限&非相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()
            let { chunkId } = await putData(10, zone1device1, undefined, undefined)

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        undefined,
                        file_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 获取关联非相应chunk居然成功了`)
        })
        it("getData chunk目标对象 关联file —— 无file对象权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "file", new cyfs.AccessString(0o000)).then()
            let chunkId = chunkIdList![0]
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        undefined,
                        file_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })

        it("getData chunk目标对象 关联file reqPath 有该path权限&相应chunck 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file").then()

            let chunkId = chunkIdList![0]
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("/test_nDn", cyfs.AccessString.default())
            await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        file_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联file reqPath 无该path权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file").then()

            let chunkId = chunkIdList![0]
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        undefined,
                        file_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联file reqPath 有该path权限&非相应chunck 获取失败", async () => {

            let { file_id, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file").then()

            let { chunkId } = await putData(10, zone1device1, undefined, undefined)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        undefined,
                        file_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })

        it.skip("getData chunk目标对象 关联dir  有该dir权限&相应chunck 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", cyfs.AccessString.default()).then()

            let chunkId = chunkIdList![0]
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })//---------------------------------------chunk不能直接关联到dir上吧会找不到，只能关联到file上吧（或dir+innerpath)
        it.skip("getData chunk目标对象 关联dir  有该dir权限&非相应chunck 获取失败", async () => {

            let { dir_id, inner_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

            let { chunkId } = await putData(10, zone1device1, undefined, undefined)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        undefined,
                        dir_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it.skip("getData chunk目标对象 关联dir  无该dir权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024, cyfs.NDNAPILevel.Router).then()

            let chunkId = chunkIdList![0]
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })

        it.skip("getData chunk目标对象 关联dir reqPath 有该path权限&相应chunck 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

            let chunkId = chunkIdList![0]
            //注册req_path
            let path = "/test_nDn"
            // let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            // let op_env = (await stub.create_path_op_env()).unwrap()
            // await op_env.set_with_path(path, file_id.object_id, undefined, true)
            // let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it.skip("getData chunk目标对象 关联dir reqPath 有该path权限&非相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024, cyfs.NDNAPILevel.Router).then()

            let { chunkId } = await putData(10, zone1device1, undefined, undefined)
            //注册req_path
            let path = "/test_nDn"
            // let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            // let op_env = (await stub.create_path_op_env()).unwrap()
            // await op_env.set_with_path(path, file_id.object_id, undefined, true)
            // let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it.skip("getData chunk目标对象 关联dir reqPath 无该path权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024, cyfs.NDNAPILevel.Router).then()

            let chunkId = chunkIdList![0]
            //注册req_path
            let path = "/test_nDn"
            // let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            // let op_env = (await stub.create_path_op_env()).unwrap()
            // await op_env.set_with_path(path, file_id.object_id, undefined, true)
            // let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })

        it("getData chunk目标对象 关联dir+innerPath  有该dir权限&相应chunck 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

            let chunkId = chunkIdList![0]
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联dir+innerpath  有该dir权限&非相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", cyfs.AccessString.default()).then()

            let { chunkId } = await putData(10, zone1device1, undefined, undefined)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联dir+innerPath  无该dir权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", new cyfs.AccessString(0o000)).then()

            let chunkId = chunkIdList![0]
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })

        it("getData chunk目标对象 关联dir+innerpath reqPath 有该path权限&相应chunck 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()

            let chunkId = chunkIdList![0]
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("/test_nDn", cyfs.AccessString.default())
            await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联dir+innerpath reqPath 有该path权限&非相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()


            let { chunkId } = await putData(10, zone1device1, undefined, undefined)

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联dir+innerPath reqPath 无该path权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()

            let chunkId = chunkIdList![0]

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })


        it("getData file目标对象 —— —— 有file对象权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: []
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData file目标对象 —— —— 无file对象权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "file", new cyfs.AccessString(0o000)).then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: []
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it("getData file目标对象 —— reqPath 有path对象权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file").then()

            //给指定设备dec授权该path,不指定默认当前source

            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("/test_nDn", cyfs.AccessString.default())
            await zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)
            // await zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).remove_access(item)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: []
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData file目标对象 —— reqPath 无path对象权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file").then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: []
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })

        it("getData file目标对象 关联dir+innerPath —— 有dir对象权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path)]
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData file目标对象 关联dir+innerPath —— 无dir对象权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", new cyfs.AccessString(0o000)).then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path)]
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it("getData file目标对象 关联dir+innerPath reqpath 有该path权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()
            //给指定设备dec授权该path,不指定默认当前source

            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("/test_nDn", cyfs.AccessString.default())
            await zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)
            // await zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).remove_access(item)


            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path)]
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData file目标对象 关联dir+innerPath reqpath 无path权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()


            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path)]
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })

        it("getData dir+innerPath目标对象 —— —— 有dir对象权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()


            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                object_id: dir_id.object_id,
                inner_path: inner_path,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData dir+innerPath目标对象 —— —— 无dir对象权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", new cyfs.AccessString(0o000)).then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                object_id: dir_id.object_id,
                inner_path: inner_path,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it("getData dir+innerPath目标对象 —— reqpath 有path权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()

            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("/test_nDn", cyfs.AccessString.default())
            await zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                object_id: dir_id.object_id,
                inner_path: inner_path,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData dir+innerPath目标对象 —— reqpath 无path权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir", "dir", cyfs.AccessString.default()).then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                object_id: dir_id.object_id,
                inner_path: inner_path,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })

        it("同zone跨dec query_file 接口调用", async () => {
            let fileName = RandomGenerator.string(10);
            let filePath = path.join(__dirname, "../../test_cache_file/source")
            let file = await RandomGenerator.createRandomFile(filePath, fileName, 10 * 1024 * 1024);
            let add_file = await zone1device1.trans().publish_file({
                common: {// 请求路径，可为空
                    req_path: "qaTest",
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                owner: cyfs.ObjectId.from_base_58(ZoneSimulator.zone1_people).unwrap(),
                local_path: path.join(filePath, fileName),
                chunk_size: 4 * 1024 * 1024
            })
            let file_id = add_file.unwrap().file_id;

            let task = await zone1device1.trans().create_task({
                common: {
                    req_path: undefined,
                    dec_id: zone1device1_dec_id,
                    level: cyfs.NDNAPILevel.NDN,
                    target: zone1device1.local_device_id().object_id,
                    referer_object: [],
                    flags: 1,
                },
                object_id: file_id,
                local_path: path.join(filePath, fileName),
                device_list: [zone1device1.local_device_id()],
                auto_start: true,
            })
            console.info(`file_id: ${file_id}`)
            await cyfs.sleep(5 * 1000)
            let rep2: cyfs.NDNQueryFileOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.NDN,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
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
            let resp = await zone1device2.ndn_service().query_file(rep2);
            console.info(JSON.stringify(resp, null, 4))
            assert(!resp.err, `queryfile 调用失败`)
        })


    })
    describe("跨zone同dec", function () {
        this.beforeEach(async function () { await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).clear_access() })
        it("getData chunk目标对象 —— —— 不支持", async () => {
            let { chunkId } = await putData(10, ZoneSimulator.zone1_device1_stack, undefined, undefined)
            let rep2: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: ZoneSimulator.APPID,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: ZoneSimulator.zone1_device1_stack.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await ZoneSimulator.zone2_device1_stack.ndn_service().get_data(rep2);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })

        it("getData chunk目标对象 —— reqPath 有该path权限&validate一致 获取成功", async () => {
            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(ZoneSimulator.zone1_device1_stack, ZoneSimulator.zone1_device1_stack, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-chunk", "chunk", cyfs.AccessString.full(), "chunk").then()

            // let {chunkId,req_path} = await putData(1, ZoneSimulator.zone1_device1_stack, undefined, "/test_nDn")
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("/test_nDn", cyfs.AccessString.full())
            await ZoneSimulator.zone1_device1_stack.root_state_meta_stub(ZoneSimulator.zone1_device1_stack.local_device_id().object_id, ZoneSimulator.APPID).add_access(item)

            let rep2: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: ZoneSimulator.APPID,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: ZoneSimulator.zone1_device1_stack.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                object_id: chunkIdList![0].calculate_id(),
                inner_path: undefined
            }
            console.log("---------=======---===========================" + ZoneSimulator.zone2_device1_stack.dec_id)
            //调用接口
            let resp = await ZoneSimulator.zone2_device1_stack.ndn_service().get_data(rep2);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 获取chunk失败`)

        })


        it("getData chunk目标对象 关联file —— 有file对象权限&相应chunck 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(ZoneSimulator.zone1_device1_stack, ZoneSimulator.zone1_device1_stack, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "file", cyfs.AccessString.full(), "file").then()
            let chunkId = chunkIdList![0]
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: ZoneSimulator.APPID,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: ZoneSimulator.zone1_device1_stack.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        undefined,
                        file_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await ZoneSimulator.zone2_device1_stack.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联file —— 有file对象权限&非相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(ZoneSimulator.zone1_device1_stack, ZoneSimulator.zone1_device1_stack, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()
            let { chunkId } = await putData(10, zone1device1, undefined, undefined)

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: ZoneSimulator.APPID,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: ZoneSimulator.zone1_device1_stack.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        undefined,
                        file_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await ZoneSimulator.zone2_device1_stack.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 获取关联非相应chunk居然成功了`)
        })
        it("getData chunk目标对象 关联file —— 无file对象权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(ZoneSimulator.zone1_device1_stack, ZoneSimulator.zone1_device1_stack, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "file", new cyfs.AccessString(0o000)).then()
            let chunkId = chunkIdList![0]
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: ZoneSimulator.APPID,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: ZoneSimulator.zone1_device1_stack.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        undefined,
                        file_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await ZoneSimulator.zone2_device1_stack.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })

        it("getData chunk目标对象 关联file reqPath 有该path权限&相应chunck 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(ZoneSimulator.zone1_device1_stack, ZoneSimulator.zone1_device1_stack, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file", "file", cyfs.AccessString.full(), "file").then()
            let chunkId = chunkIdList![0]
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("/test_nDn", cyfs.AccessString.full())
            await ZoneSimulator.zone1_device1_stack.root_state_meta_stub(ZoneSimulator.zone1_device1_stack.local_device_id().object_id, ZoneSimulator.APPID).add_access(item)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: ZoneSimulator.APPID,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: ZoneSimulator.zone1_device1_stack.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        undefined,
                        file_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await ZoneSimulator.zone2_device1_stack.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)
        })
        it("getData chunk目标对象 关联file reqPath 无该path权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file", "file", cyfs.AccessString.full()).then()

            let chunkId = chunkIdList![0]
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        undefined,
                        file_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联file reqPath 有该path权限&非相应chunck 获取失败", async () => {

            let { file_id, req_path } = await Ready.addDir(ZoneSimulator.zone1_device1_stack, ZoneSimulator.zone1_device1_stack, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file", "file", cyfs.AccessString.full()).then()

            let { chunkId } = await putData(10, zone1device1, undefined, undefined)
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("/test_nDn", cyfs.AccessString.full())
            await ZoneSimulator.zone1_device1_stack.root_state_meta_stub(ZoneSimulator.zone1_device1_stack.local_device_id().object_id, ZoneSimulator.APPID).add_access(item)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: ZoneSimulator.APPID,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: ZoneSimulator.zone1_device1_stack.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        undefined,
                        file_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await ZoneSimulator.zone2_device1_stack.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })

        it.skip("getData chunk目标对象 关联dir  有该dir权限&相应chunck 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", cyfs.AccessString.default()).then()

            let chunkId = chunkIdList![0]
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })//---------------------------------------chunk不能直接关联到dir上吧会找不到，只能关联到file上吧（或dir+innerpath)
        it.skip("getData chunk目标对象 关联dir  有该dir权限&非相应chunck 获取失败", async () => {

            let { dir_id, inner_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

            let { chunkId } = await putData(10, zone1device1, undefined, undefined)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        undefined,
                        dir_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it.skip("getData chunk目标对象 关联dir  无该dir权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024, cyfs.NDNAPILevel.Router).then()

            let chunkId = chunkIdList![0]
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })

        it("getData chunk目标对象 关联dir reqPath 有该path权限&相应chunck 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(ZoneSimulator.zone1_device1_stack, ZoneSimulator.zone1_device1_stack, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir", "dir", cyfs.AccessString.full()).then()

            let chunkId = chunkIdList![0]
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("/test_nDn", cyfs.AccessString.full())
            await ZoneSimulator.zone1_device1_stack.root_state_meta_stub(ZoneSimulator.zone1_device1_stack.local_device_id().object_id, ZoneSimulator.APPID).add_access(item)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: ZoneSimulator.APPID,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: ZoneSimulator.zone1_device1_stack.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await ZoneSimulator.zone2_device1_stack.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联dir reqPath 有该path权限&非相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024, cyfs.NDNAPILevel.Router, "mount-dir", "dir", cyfs.AccessString.full()).then()

            let { chunkId } = await putData(10, zone1device1, undefined, undefined)
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("/test_nDn", cyfs.AccessString.full())
            await ZoneSimulator.zone1_device1_stack.root_state_meta_stub(ZoneSimulator.zone1_device1_stack.local_device_id().object_id, ZoneSimulator.APPID).add_access(item)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联dir reqPath 无该path权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024, cyfs.NDNAPILevel.Router, "mount-dir", "dir", cyfs.AccessString.full()).then()

            let chunkId = chunkIdList![0]
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })

        it("getData chunk目标对象 关联dir+innerPath  有该dir权限&相应chunck 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(ZoneSimulator.zone1_device1_stack, ZoneSimulator.zone1_device1_stack, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", cyfs.AccessString.full()).then()

            let chunkId = chunkIdList![0]
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: ZoneSimulator.APPID,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: ZoneSimulator.zone1_device1_stack.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await ZoneSimulator.zone2_device1_stack.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联dir+innerpath  有该dir权限&非相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(ZoneSimulator.zone1_device1_stack, ZoneSimulator.zone1_device1_stack, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", cyfs.AccessString.default()).then()

            let { chunkId } = await putData(10, zone1device1, undefined, undefined)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: ZoneSimulator.APPID,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: ZoneSimulator.zone1_device1_stack.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await ZoneSimulator.zone2_device1_stack.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联dir+innerPath  无该dir权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(ZoneSimulator.zone1_device1_stack, ZoneSimulator.zone1_device1_stack, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", new cyfs.AccessString(0o000)).then()

            let chunkId = chunkIdList![0]
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: ZoneSimulator.APPID,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: ZoneSimulator.zone1_device1_stack.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await ZoneSimulator.zone2_device1_stack.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })

        it("getData chunk目标对象 关联dir+innerpath reqPath 有该path权限&相应chunck 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(ZoneSimulator.zone1_device1_stack, ZoneSimulator.zone1_device1_stack, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir", "dir", cyfs.AccessString.full()).then()

            let chunkId = chunkIdList![0]
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("/test_nDn", cyfs.AccessString.full())
            await ZoneSimulator.zone1_device1_stack.root_state_meta_stub(ZoneSimulator.zone1_device1_stack.local_device_id().object_id, ZoneSimulator.APPID).add_access(item)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: ZoneSimulator.APPID,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: ZoneSimulator.zone1_device1_stack.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await ZoneSimulator.zone2_device1_stack.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联dir+innerpath reqPath 有该path权限&非相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(ZoneSimulator.zone1_device1_stack, ZoneSimulator.zone1_device1_stack, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir", "dir", cyfs.AccessString.full()).then()


            let { chunkId } = await putData(10, zone1device1, undefined, undefined)
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("/test_nDn", cyfs.AccessString.full())
            await ZoneSimulator.zone1_device1_stack.root_state_meta_stub(ZoneSimulator.zone1_device1_stack.local_device_id().object_id, ZoneSimulator.APPID).add_access(item)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: ZoneSimulator.APPID,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await ZoneSimulator.zone2_device1_stack.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联dir+innerPath reqPath 无该path权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(ZoneSimulator.zone1_device1_stack, ZoneSimulator.zone1_device1_stack, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir", "dir", cyfs.AccessString.full()).then()

            let chunkId = chunkIdList![0]

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: ZoneSimulator.APPID,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: ZoneSimulator.zone1_device1_stack.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await ZoneSimulator.zone2_device1_stack.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })


        it("getData file目标对象 —— —— 有file对象权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(ZoneSimulator.zone1_device1_stack, ZoneSimulator.zone1_device1_stack, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "file", cyfs.AccessString.full()).then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: ZoneSimulator.APPID,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: ZoneSimulator.zone1_device1_stack.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: []
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await ZoneSimulator.zone2_device1_stack.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData file目标对象 —— —— 无file对象权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(ZoneSimulator.zone1_device1_stack, ZoneSimulator.zone1_device1_stack, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "file", new cyfs.AccessString(0o000)).then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: ZoneSimulator.APPID,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: ZoneSimulator.zone1_device1_stack.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: []
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await ZoneSimulator.zone2_device1_stack.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it("getData file目标对象 —— reqPath 有path对象权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file", "file", cyfs.AccessString.full()).then()

            //给指定设备dec授权该path,不指定默认当前source

            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("/test_nDn", cyfs.AccessString.default())
            await ZoneSimulator.zone1_device1_stack.root_state_meta_stub(ZoneSimulator.zone1_device1_stack.local_device_id().object_id, ZoneSimulator.APPID).add_access(item)
            // await zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).remove_access(item)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: []
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData file目标对象 —— reqPath 无path对象权限 获取失败", async () => {
            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file", "file", cyfs.AccessString.full()).then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: []
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })

        it("getData file目标对象 关联dir+innerPath —— 有dir对象权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(ZoneSimulator.zone1_device1_stack, ZoneSimulator.zone1_device1_stack, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", cyfs.AccessString.full()).then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: ZoneSimulator.APPID,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: ZoneSimulator.zone1_device1_stack.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path)]
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined
            }
            //调用接口
            let resp = await ZoneSimulator.zone2_device1_stack.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData file目标对象 关联dir+innerPath —— 无dir对象权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(ZoneSimulator.zone1_device1_stack, ZoneSimulator.zone1_device1_stack, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", new cyfs.AccessString(0o000)).then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: ZoneSimulator.APPID,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: ZoneSimulator.zone1_device1_stack.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path)]
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await ZoneSimulator.zone2_device1_stack.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it("getData file目标对象 关联dir+innerPath reqpath 有该path权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, req_path } = await Ready.addDir(ZoneSimulator.zone1_device1_stack, ZoneSimulator.zone1_device1_stack, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir", "dir", cyfs.AccessString.full()).then()
            //给指定设备dec授权该path,不指定默认当前source

            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("/test_nDn", cyfs.AccessString.default())
            await ZoneSimulator.zone1_device1_stack.root_state_meta_stub(ZoneSimulator.zone1_device1_stack.local_device_id().object_id, ZoneSimulator.APPID).add_access(item)
            // await zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).remove_access(item)


            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: ZoneSimulator.APPID,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: ZoneSimulator.zone1_device1_stack.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path)]
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await ZoneSimulator.zone2_device1_stack.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData file目标对象 关联dir+innerPath reqpath 无path权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(ZoneSimulator.zone1_device1_stack, ZoneSimulator.zone1_device1_stack, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir", "dir", cyfs.AccessString.full()).then()


            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: ZoneSimulator.APPID,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: ZoneSimulator.zone1_device1_stack.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path)]
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await ZoneSimulator.zone2_device1_stack.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })

        it("getData dir+innerPath目标对象 —— —— 有dir对象权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(ZoneSimulator.zone1_device1_stack, ZoneSimulator.zone1_device1_stack, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", cyfs.AccessString.full()).then()


            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: ZoneSimulator.APPID,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: ZoneSimulator.zone1_device1_stack.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                object_id: dir_id.object_id,
                inner_path: inner_path,
            }
            //调用接口
            let resp = await ZoneSimulator.zone2_device1_stack.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData dir+innerPath目标对象 —— —— 无dir对象权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(ZoneSimulator.zone1_device1_stack, ZoneSimulator.zone1_device1_stack, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", new cyfs.AccessString(0o000)).then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: ZoneSimulator.APPID,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: ZoneSimulator.zone1_device1_stack.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                object_id: dir_id.object_id,
                inner_path: inner_path,
            }
            //调用接口
            let resp = await ZoneSimulator.zone2_device1_stack.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it("getData dir+innerPath目标对象 —— reqpath 有path权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(ZoneSimulator.zone1_device1_stack, ZoneSimulator.zone1_device1_stack, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir", "dir", cyfs.AccessString.full()).then()
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("/test_nDn", cyfs.AccessString.default())
            await ZoneSimulator.zone1_device1_stack.root_state_meta_stub(ZoneSimulator.zone1_device1_stack.local_device_id().object_id, ZoneSimulator.APPID).add_access(item)

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: ZoneSimulator.APPID,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: ZoneSimulator.zone1_device1_stack.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                object_id: dir_id.object_id,
                inner_path: inner_path,
            }
            //调用接口
            let resp = await ZoneSimulator.zone2_device1_stack.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData dir+innerPath目标对象 —— reqpath 无path权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(ZoneSimulator.zone1_device1_stack, ZoneSimulator.zone1_device1_stack, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir", "dir", cyfs.AccessString.full()).then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: ZoneSimulator.APPID,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: ZoneSimulator.zone1_device1_stack.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                object_id: dir_id.object_id,
                inner_path: inner_path,
            }
            //调用接口
            let resp = await ZoneSimulator.zone2_device1_stack.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })

    })
    describe("跨zone跨dec", function () {
        this.beforeEach(async function () { await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).clear_access() })

        it("getData chunk目标对象 —— —— 不支持跨zone", async () => {
            let { chunkId } = await putData(10, zone1device1, undefined, undefined)
            let rep2: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep2);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })

        it("getData chunk目标对象 —— reqPath 有该path权限&validate一致 获取成功", async () => {
            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-chunk").then()
            let chunkId = chunkIdList![0]
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("test_nDn", cyfs.AccessString.full())
            await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)

            let rep2: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep2);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 获取chunk失败`)

        })

        it("getData chunk目标对象 关联file —— 有file对象权限&相应chunck 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "file", cyfs.AccessString.full()).then()
            let chunkId = chunkIdList![0]
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        undefined,
                        file_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联file —— 有file对象权限&非相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()
            let { chunkId } = await putData(10, zone1device1, undefined, undefined)

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        undefined,
                        file_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 获取关联非相应chunk居然成功了`)
        })
        it("getData chunk目标对象 关联file —— 无file对象权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "file", new cyfs.AccessString(0o000)).then()
            let chunkId = chunkIdList![0]
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        undefined,
                        file_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })

        it("getData chunk目标对象 关联file reqPath 有该path权限&相应chunck 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file", "file", cyfs.AccessString.full()).then()

            let chunkId = chunkIdList![0]
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("/test_nDn", cyfs.AccessString.full())
            await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        file_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联file reqPath 无该path权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file").then()

            let chunkId = chunkIdList![0]
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        undefined,
                        file_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联file reqPath 有该path权限&非相应chunck 获取失败", async () => {

            let { file_id, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file").then()

            let { chunkId } = await putData(10, zone1device1, undefined, undefined)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        undefined,
                        file_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })

        it.skip("getData chunk目标对象 关联dir  有该dir权限&相应chunck 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", cyfs.AccessString.default()).then()

            let chunkId = chunkIdList![0]
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })//---------------------------------------chunk不能直接关联到dir上吧会找不到，只能关联到file上吧（或dir+innerpath)
        it.skip("getData chunk目标对象 关联dir  有该dir权限&非相应chunck 获取失败", async () => {

            let { dir_id, inner_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

            let { chunkId } = await putData(10, zone1device1, undefined, undefined)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        undefined,
                        dir_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it.skip("getData chunk目标对象 关联dir  无该dir权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024, cyfs.NDNAPILevel.Router).then()

            let chunkId = chunkIdList![0]
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })

        it.skip("getData chunk目标对象 关联dir reqPath 有该path权限&相应chunck 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

            let chunkId = chunkIdList![0]
            //注册req_path
            let path = "/test_nDn"
            // let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            // let op_env = (await stub.create_path_op_env()).unwrap()
            // await op_env.set_with_path(path, file_id.object_id, undefined, true)
            // let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it.skip("getData chunk目标对象 关联dir reqPath 有该path权限&非相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024, cyfs.NDNAPILevel.Router).then()

            let { chunkId } = await putData(10, zone1device1, undefined, undefined)
            //注册req_path
            let path = "/test_nDn"
            // let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            // let op_env = (await stub.create_path_op_env()).unwrap()
            // await op_env.set_with_path(path, file_id.object_id, undefined, true)
            // let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it.skip("getData chunk目标对象 关联dir reqPath 无该path权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024, cyfs.NDNAPILevel.Router).then()

            let chunkId = chunkIdList![0]
            //注册req_path
            let path = "/test_nDn"
            // let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            // let op_env = (await stub.create_path_op_env()).unwrap()
            // await op_env.set_with_path(path, file_id.object_id, undefined, true)
            // let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })

        it("getData chunk目标对象 关联dir+innerPath  有该dir权限&相应chunck 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", cyfs.AccessString.full()).then()

            let chunkId = chunkIdList![0]
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联dir+innerpath  有该dir权限&非相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", cyfs.AccessString.full()).then()

            let { chunkId } = await putData(10, zone1device1, undefined, undefined)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联dir+innerPath  无该dir权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", new cyfs.AccessString(0o000)).then()

            let chunkId = chunkIdList![0]
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })

        it("getData chunk目标对象 关联dir+innerpath reqPath 有该path权限&相应chunck 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir", "dir", cyfs.AccessString.full()).then()

            let chunkId = chunkIdList![0]
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("/test_nDn", cyfs.AccessString.full())
            await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联dir+innerpath reqPath 有该path权限&非相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir", "dir", cyfs.AccessString.full()).then()


            let { chunkId } = await putData(10, zone1device1, undefined, undefined)
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("/test_nDn", cyfs.AccessString.full())
            await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联dir+innerPath reqPath 无该path权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir", "dir", cyfs.AccessString.full()).then()

            let chunkId = chunkIdList![0]

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })


        it("getData file目标对象 —— —— 有file对象权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "file", cyfs.AccessString.full()).then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: []
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData file目标对象 —— —— 无file对象权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "file", new cyfs.AccessString(0o000)).then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: []
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it("getData file目标对象 —— reqPath 有path对象权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file", "file", cyfs.AccessString.full()).then()

            //给指定设备dec授权该path,不指定默认当前source

            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("/test_nDn", cyfs.AccessString.full())
            await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)
            // await zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).remove_access(item)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: []
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData file目标对象 —— reqPath 无path对象权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file", "file", cyfs.AccessString.full()).then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: []
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })

        it("getData file目标对象 关联dir+innerPath —— 有dir对象权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", cyfs.AccessString.full()).then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path)]
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData file目标对象 关联dir+innerPath —— 无dir对象权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path)]
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it("getData file目标对象 关联dir+innerPath reqpath 有该path权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir", "dir", cyfs.AccessString.full()).then()
            //给指定设备dec授权该path,不指定默认当前source

            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("/test_nDn", cyfs.AccessString.full())
            await zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)
            // await zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).remove_access(item)


            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path)]
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData file目标对象 关联dir+innerPath reqpath 无path权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir", "dir", cyfs.AccessString.full()).then()


            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path)]
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })

        it("getData dir+innerPath目标对象 —— —— 有dir对象权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", cyfs.AccessString.full()).then()


            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                object_id: dir_id.object_id,
                inner_path: inner_path,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData dir+innerPath目标对象 —— —— 无dir对象权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                object_id: dir_id.object_id,
                inner_path: inner_path,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it("getData dir+innerPath目标对象 —— reqpath 有path权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir", "dir", cyfs.AccessString.full()).then()

            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("/test_nDn", cyfs.AccessString.full())
            await zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                object_id: dir_id.object_id,
                inner_path: inner_path,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData dir+innerPath目标对象 —— reqpath 无path权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir", "dir", cyfs.AccessString.full()).then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                object_id: dir_id.object_id,
                inner_path: inner_path,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })

    })

    describe("同zone跨dec,publishfile", function () {
        this.beforeEach(async function () { await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).clear_access() })


        it("getData chunk目标对象 —— reqPath 有该path权限&validate一致 获取成功", async () => {
            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device2, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-chunk").then()
            let chunkId = chunkIdList![0]
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("test_nDn", cyfs.AccessString.default())
            await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)

            let rep2: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep2);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 获取chunk失败`)

        })

        it("getData chunk目标对象 关联file —— 有file对象权限&相应chunck 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device2, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()
            let chunkId = chunkIdList![0]
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        undefined,
                        file_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联file —— 有file对象权限&非相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device2, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()
            let { chunkId } = await putData(10, zone1device1, undefined, undefined)

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        undefined,
                        file_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 获取关联非相应chunk居然成功了`)
        })
        it("getData chunk目标对象 关联file —— 无file对象权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device2, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "file", new cyfs.AccessString(0o000)).then()
            let chunkId = chunkIdList![0]
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        undefined,
                        file_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })

        it("getData chunk目标对象 关联file reqPath 有该path权限&相应chunck 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device2, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file").then()

            let chunkId = chunkIdList![0]
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("/test_nDn", cyfs.AccessString.default())
            await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        file_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联file reqPath 无该path权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device2, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file").then()

            let chunkId = chunkIdList![0]
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        undefined,
                        file_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联file reqPath 有该path权限&非相应chunck 获取失败", async () => {

            let { file_id, req_path } = await Ready.addDir(zone1device2, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file").then()

            let { chunkId } = await putData(10, zone1device1, undefined, undefined)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        undefined,
                        file_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })

        it.skip("getData chunk目标对象 关联dir  有该dir权限&相应chunck 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device2, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", cyfs.AccessString.default()).then()

            let chunkId = chunkIdList![0]
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })//---------------------------------------chunk不能直接关联到dir上吧会找不到，只能关联到file上吧（或dir+innerpath)
        it.skip("getData chunk目标对象 关联dir  有该dir权限&非相应chunck 获取失败", async () => {

            let { dir_id, inner_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

            let { chunkId } = await putData(10, zone1device1, undefined, undefined)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        undefined,
                        dir_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it.skip("getData chunk目标对象 关联dir  无该dir权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024, cyfs.NDNAPILevel.Router).then()

            let chunkId = chunkIdList![0]
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })

        it.skip("getData chunk目标对象 关联dir reqPath 有该path权限&相应chunck 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

            let chunkId = chunkIdList![0]
            //注册req_path
            let path = "/test_nDn"
            // let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            // let op_env = (await stub.create_path_op_env()).unwrap()
            // await op_env.set_with_path(path, file_id.object_id, undefined, true)
            // let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it.skip("getData chunk目标对象 关联dir reqPath 有该path权限&非相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024, cyfs.NDNAPILevel.Router).then()

            let { chunkId } = await putData(10, zone1device1, undefined, undefined)
            //注册req_path
            let path = "/test_nDn"
            // let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            // let op_env = (await stub.create_path_op_env()).unwrap()
            // await op_env.set_with_path(path, file_id.object_id, undefined, true)
            // let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it.skip("getData chunk目标对象 关联dir reqPath 无该path权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024, cyfs.NDNAPILevel.Router).then()

            let chunkId = chunkIdList![0]
            //注册req_path
            let path = "/test_nDn"
            // let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            // let op_env = (await stub.create_path_op_env()).unwrap()
            // await op_env.set_with_path(path, file_id.object_id, undefined, true)
            // let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })

        it("getData chunk目标对象 关联dir+innerPath  有该dir权限&相应chunck 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device2, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

            let chunkId = chunkIdList![0]
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联dir+innerpath  有该dir权限&非相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device2, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", cyfs.AccessString.default()).then()

            let { chunkId } = await putData(10, zone1device1, undefined, undefined)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联dir+innerPath  无该dir权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device2, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", new cyfs.AccessString(0o000)).then()

            let chunkId = chunkIdList![0]
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })

        it("getData chunk目标对象 关联dir+innerpath reqPath 有该path权限&相应chunck 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device2, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()

            let chunkId = chunkIdList![0]
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("/test_nDn", cyfs.AccessString.default())
            await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联dir+innerpath reqPath 有该path权限&非相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device2, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()


            let { chunkId } = await putData(10, zone1device1, undefined, undefined)

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联dir+innerPath reqPath 无该path权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device2, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()

            let chunkId = chunkIdList![0]

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })


        it("getData file目标对象 —— —— 有file对象权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device2, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: []
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData file目标对象 —— —— 无file对象权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device2, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "file", new cyfs.AccessString(0o000)).then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: []
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it("getData file目标对象 —— reqPath 有path对象权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device2, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file").then()

            //给指定设备dec授权该path,不指定默认当前source

            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("/test_nDn", cyfs.AccessString.default())
            await zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)
            // await zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).remove_access(item)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: []
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData file目标对象 —— reqPath 无path对象权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device2, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file").then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: []
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })

        it("getData file目标对象 关联dir+innerPath —— 有dir对象权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device2, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path)]
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData file目标对象 关联dir+innerPath —— 无dir对象权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device2, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", new cyfs.AccessString(0o000)).then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path)]
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it("getData file目标对象 关联dir+innerPath reqpath 有该path权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, req_path } = await Ready.addDir(zone1device2, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()
            //给指定设备dec授权该path,不指定默认当前source

            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("/test_nDn", cyfs.AccessString.default())
            await zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)
            // await zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).remove_access(item)


            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path)]
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData file目标对象 关联dir+innerPath reqpath 无path权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device2, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()


            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path)]
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })

        it("getData dir+innerPath目标对象 —— —— 有dir对象权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device2, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()


            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                object_id: dir_id.object_id,
                inner_path: inner_path,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData dir+innerPath目标对象 —— —— 无dir对象权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device2, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", new cyfs.AccessString(0o000)).then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                object_id: dir_id.object_id,
                inner_path: inner_path,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it("getData dir+innerPath目标对象 —— reqpath 有path权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device2, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()

            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("/test_nDn", cyfs.AccessString.default())
            await zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                object_id: dir_id.object_id,
                inner_path: inner_path,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData dir+innerPath目标对象 —— reqpath 无path权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device2, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir", "dir", cyfs.AccessString.default()).then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                object_id: dir_id.object_id,
                inner_path: inner_path,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })




    })
    describe("跨zone跨dec,publishfile", function () {
        this.beforeEach(async function () { await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).clear_access() })

        it("getData chunk目标对象 —— —— 不支持跨zone", async () => {
            let { chunkId } = await putData(10, zone1device1, undefined, undefined)
            let rep2: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep2);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })

        it("getData chunk目标对象 —— reqPath 有该path权限&validate一致 获取成功", async () => {
            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-chunk").then()
            let chunkId = chunkIdList![0]
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("test_nDn", cyfs.AccessString.full())
            await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)

            let rep2: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep2);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 获取chunk失败`)

        })

        it("getData chunk目标对象 关联file —— 有file对象权限&相应chunck 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "file", cyfs.AccessString.full()).then()
            let chunkId = chunkIdList![0]
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        undefined,
                        file_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联file —— 有file对象权限&非相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()
            let { chunkId } = await putData(10, zone1device1, undefined, undefined)

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        undefined,
                        file_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 获取关联非相应chunk居然成功了`)
        })
        it("getData chunk目标对象 关联file —— 无file对象权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "file", new cyfs.AccessString(0o000)).then()
            let chunkId = chunkIdList![0]
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        undefined,
                        file_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })

        it("getData chunk目标对象 关联file reqPath 有该path权限&相应chunck 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file", "file", cyfs.AccessString.full()).then()

            let chunkId = chunkIdList![0]
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("/test_nDn", cyfs.AccessString.full())
            await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        file_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联file reqPath 无该path权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file").then()

            let chunkId = chunkIdList![0]
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        undefined,
                        file_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联file reqPath 有该path权限&非相应chunck 获取失败", async () => {

            let { file_id, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file").then()

            let { chunkId } = await putData(10, zone1device1, undefined, undefined)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        undefined,
                        file_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })

        it.skip("getData chunk目标对象 关联dir  有该dir权限&相应chunck 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", cyfs.AccessString.default()).then()

            let chunkId = chunkIdList![0]
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })//---------------------------------------chunk不能直接关联到dir上吧会找不到，只能关联到file上吧（或dir+innerpath)
        it.skip("getData chunk目标对象 关联dir  有该dir权限&非相应chunck 获取失败", async () => {

            let { dir_id, inner_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

            let { chunkId } = await putData(10, zone1device1, undefined, undefined)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device2_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        undefined,
                        dir_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device2.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it.skip("getData chunk目标对象 关联dir  无该dir权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024, cyfs.NDNAPILevel.Router).then()

            let chunkId = chunkIdList![0]
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })

        it.skip("getData chunk目标对象 关联dir reqPath 有该path权限&相应chunck 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

            let chunkId = chunkIdList![0]
            //注册req_path
            let path = "/test_nDn"
            // let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            // let op_env = (await stub.create_path_op_env()).unwrap()
            // await op_env.set_with_path(path, file_id.object_id, undefined, true)
            // let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it.skip("getData chunk目标对象 关联dir reqPath 有该path权限&非相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024, cyfs.NDNAPILevel.Router).then()

            let { chunkId } = await putData(10, zone1device1, undefined, undefined)
            //注册req_path
            let path = "/test_nDn"
            // let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            // let op_env = (await stub.create_path_op_env()).unwrap()
            // await op_env.set_with_path(path, file_id.object_id, undefined, true)
            // let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it.skip("getData chunk目标对象 关联dir reqPath 无该path权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024, cyfs.NDNAPILevel.Router).then()

            let chunkId = chunkIdList![0]
            //注册req_path
            let path = "/test_nDn"
            // let stub = zone1device1.root_state_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id);
            // let op_env = (await stub.create_path_op_env()).unwrap()
            // await op_env.set_with_path(path, file_id.object_id, undefined, true)
            // let o = (await op_env.commit()).unwrap()

            let req_path = new cyfs.RequestGlobalStatePath(zone1device1_dec_id, path).toString()
            console.log("------------------------> " + req_path)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })

        it("getData chunk目标对象 关联dir+innerPath  有该dir权限&相应chunck 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", cyfs.AccessString.full()).then()

            let chunkId = chunkIdList![0]
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联dir+innerpath  有该dir权限&非相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", cyfs.AccessString.full()).then()

            let { chunkId } = await putData(10, zone1device1, undefined, undefined)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联dir+innerPath  无该dir权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", new cyfs.AccessString(0o000)).then()

            let chunkId = chunkIdList![0]
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })

        it("getData chunk目标对象 关联dir+innerpath reqPath 有该path权限&相应chunck 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir", "dir", cyfs.AccessString.full()).then()

            let chunkId = chunkIdList![0]
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("/test_nDn", cyfs.AccessString.full())
            await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联dir+innerpath reqPath 有该path权限&非相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir", "dir", cyfs.AccessString.full()).then()


            let { chunkId } = await putData(10, zone1device1, undefined, undefined)
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("/test_nDn", cyfs.AccessString.full())
            await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联dir+innerPath reqPath 无该path权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir", "dir", cyfs.AccessString.full()).then()

            let chunkId = chunkIdList![0]

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })


        it("getData file目标对象 —— —— 有file对象权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "file", cyfs.AccessString.full()).then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: []
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData file目标对象 —— —— 无file对象权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "file", new cyfs.AccessString(0o000)).then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: []
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it("getData file目标对象 —— reqPath 有path对象权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file", "file", cyfs.AccessString.full()).then()

            //给指定设备dec授权该path,不指定默认当前source

            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("/test_nDn", cyfs.AccessString.full())
            await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)
            // await zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).remove_access(item)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: []
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData file目标对象 —— reqPath 无path对象权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file", "file", cyfs.AccessString.full()).then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: []
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })

        it("getData file目标对象 关联dir+innerPath —— 有dir对象权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", cyfs.AccessString.full()).then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path)]
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData file目标对象 关联dir+innerPath —— 无dir对象权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path)]
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it("getData file目标对象 关联dir+innerPath reqpath 有该path权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir", "dir", cyfs.AccessString.full()).then()
            //给指定设备dec授权该path,不指定默认当前source

            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("/test_nDn", cyfs.AccessString.full())
            await zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)
            // await zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).remove_access(item)


            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path)]
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData file目标对象 关联dir+innerPath reqpath 无path权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir", "dir", cyfs.AccessString.full()).then()


            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id, inner_path)]
                    ,
                    flags: 1,
                },
                object_id: file_id.object_id,
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })

        it("getData dir+innerPath目标对象 —— —— 有dir对象权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", cyfs.AccessString.full()).then()


            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                object_id: dir_id.object_id,
                inner_path: inner_path,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData dir+innerPath目标对象 —— —— 无dir对象权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                object_id: dir_id.object_id,
                inner_path: inner_path,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it("getData dir+innerPath目标对象 —— reqpath 有path权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir", "dir", cyfs.AccessString.full()).then()

            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("/test_nDn", cyfs.AccessString.full())
            await zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                object_id: dir_id.object_id,
                inner_path: inner_path,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData dir+innerPath目标对象 —— reqpath 无path权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir", "dir", cyfs.AccessString.full()).then()

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone2device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [],
                    flags: 1,
                },
                object_id: dir_id.object_id,
                inner_path: inner_path,
            }
            //调用接口
            let resp = await zone2device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })

    })

    describe("Dir chunk 模式", function () {
        it("不同模式构造dir_id相同", async () => {
            let owner = cyfs.ObjectId.default();
            let inner_node = new cyfs.InnerNodeInfo(new cyfs.Attributes(0), new cyfs.InnerNode({ object_id: cyfs.ObjectId.default() }));

            let object_map: cyfs.BuckyHashMap<cyfs.BuckyString, cyfs.InnerNodeInfo> = new cyfs.BuckyHashMap()
            object_map.set(new cyfs.BuckyString("path1"), inner_node)
            let list: cyfs.NDNObjectList = new cyfs.NDNObjectList(undefined, object_map)

            // 第一种情况，构造一个普通大小的dir，内容可以放到desc里面
            let attr = new cyfs.Attributes(0xFFFF);
            let dir = cyfs.Dir.create(owner,
                attr,
                new cyfs.NDNObjectInfo({ obj_list: list }),
                { obj_list: new cyfs.BuckyHashMap() },
                (builder) => {
                    builder.no_create_time().update_time(cyfs.JSBI.BigInt(0)).option_owner(undefined)
                }
            );
            let dir_id = dir.desc().calculate_id();
            console.log("dir id=", dir_id);
            console.assert(dir_id.to_string() === "7jMmeXZpjj4YRfshnxsTqyDbqyo9zDoDA5phG9AXDC7X");
            let buf = dir.to_vec().unwrap();
            let hash = cyfs.HashValue.hash_data(buf);
            console.log("dir hash=", hash.to_base_58());
            // 第二种情况，对于超大内容的dir，使用chunk模式，但和上面一种模式是对等的
            let data = cyfs.to_vec(list).unwrap();
            let chunk_id = cyfs.ChunkId.calculate(data).unwrap();

            // chunk可以放到body缓存里面，方便查找；也可以独立存放，但dir在解析时候需要再次查找该chunk可能会耗时久，以及查找失败等情况
            let obj_map: cyfs.BuckyHashMap<cyfs.ObjectId, cyfs.BuckyBuffer> = new cyfs.BuckyHashMap()
            obj_map.set(chunk_id.calculate_id(), new cyfs.BuckyBuffer(data));

            let dir2 = cyfs.Dir.create(owner, attr, new cyfs.NDNObjectInfo({ chunk_id }), { obj_list: obj_map }, (builder) => {
                builder.no_create_time().update_time(cyfs.JSBI.BigInt(0)).option_owner(undefined)
            });
            let dir_id2 = dir2.desc().calculate_id();
            console.log("dir id2=", dir_id2);
            let buf2 = dir2.to_vec().unwrap();
            let hash2 = cyfs.HashValue.hash_data(buf2);
            console.log("dir2 hash=", hash2.to_base_58());

            let _dir3 = new cyfs.AnyNamedObjectDecoder().from_raw(buf).unwrap();

            // 上述两种模式生成的dir_id应该是相同
            console.assert(dir_id.to_base_58() === dir_id2.to_base_58());

            // body也可以放到chunk,由于只是影响body的结构，所以不影响dir的object_id
            let body_data = cyfs.to_vec(obj_map).unwrap();
            let body_chunk_id = cyfs.ChunkId.calculate(body_data).unwrap();
            // 注意： body_chunk_id需要额外的保存到本地，put_data(body_chunk, body_chunk_id)

            let dir4 = cyfs.Dir.create(owner, attr, new cyfs.NDNObjectInfo({ chunk_id }), { chunk_id: body_chunk_id }, (builder) => {
                builder.no_create_time().update_time(cyfs.JSBI.BigInt(0)).option_owner(undefined)
            });
            let dir_id4 = dir4.desc().calculate_id();
            console.log('dir id4=', dir_id4)
            console.assert(dir_id.to_base_58() === dir_id4.to_base_58());

        })

        it("同zone同dec getData chunk目标对象 关联dir  有该dir权限&相应chunck 获取成功", async () => {

            let { chunk_id, dir_id } = await Ready.chunkMode(chunk_mode.bodyChunk, zone1device1, zone1device1, undefined, cyfs.AccessString.default())

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id),]
                    ,
                    flags: 1,
                },
                object_id: chunk_id!.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("同zone同Dec getData chunk目标对象 关联dir  有该dir权限&非相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024*512, cyfs.NDNAPILevel.Router, "mount-dir").then()

            let { chunkId } = await putData(10, zone1device1, undefined, undefined)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it("同zone同Dec getData chunk目标对象 关联dir  无该dir权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file").then()

            let chunkId = chunkIdList![0]
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: undefined,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })


        it("同zone同Dec getData chunk目标对象 关联dir reqPath 有该path权限&相应chunck 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir", "dir", cyfs.AccessString.full()).then()

            let chunkId = chunkIdList![0]
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("test_nDn", cyfs.AccessString.default())
            await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("同zone同Dec getData chunk目标对象 关联dir reqPath 有该path权限&非相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024*512, cyfs.NDNAPILevel.Router, "mount-dir", "dir", cyfs.AccessString.full()).then()

            let { chunkId } = await putData(10, zone1device1, undefined, undefined)
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("test_nDn", cyfs.AccessString.default())
            await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)
            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })
        it("同zone同Dec getData chunk目标对象 关联dir reqPath 无该dir权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await Ready.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()

            let chunkId = chunkIdList![0]
            let item: cyfs.GlobalStatePathAccessItem = cyfs.GlobalStatePathAccessItem.new("test_nDn", cyfs.AccessString.default())
            await zone1device1.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).add_access(item)

            let rep: cyfs.NDNGetDataOutputRequest = {
                common: {
                    // 请求路径，可为空
                    req_path: req_path,
                    // 来源DEC
                    dec_id: zone1device1_dec_id,
                    // api级别
                    level: cyfs.NDNAPILevel.Router,
                    // targrt设备参数
                    target: zone1device1.local_device_id().object_id,
                    // 需要处理数据的关联对象，主要用以chunk/file等
                    referer_object: [new cyfs.NDNDataRefererObject(
                        zone1device1.local_device_id().object_id,
                        dir_id.object_id),]
                    ,
                    flags: 1,
                },
                object_id: chunkId.calculate_id(),
                inner_path: undefined,
            }
            //调用接口
            let resp = await zone1device1.ndn_service().get_data(rep);
            console.info(`${resp}`)
            assert(resp.err, `get_data 传输chunk失败`)

        })

    })
})