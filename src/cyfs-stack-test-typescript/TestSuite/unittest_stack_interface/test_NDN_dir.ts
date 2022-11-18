import assert = require('assert');
import * as cyfs from "../../cyfs_node/cyfs_node"
import { ZoneSimulator, stringToUint8Array, RandomGenerator, all_stacks, getStack, NDNTestManager, getDecId, all_dec_id } from "../../common";
import * as path from 'path';
import * as fs from 'fs-extra'
import { mongoURI } from '../../config/keys';
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
            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()
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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()
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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-chunk").then()
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
            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "file", new cyfs.AccessString(0o000)).then()
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

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-chunk").then()

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
        it("getData chunk目标对象 关联file reqPath 无该path权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file").then()
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
            assert(resp.err, `get_data 传输chunk失败`)

        })//---------------------------------------
        it("getData chunk目标对象 关联file reqPath 有该path权限&非相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024, cyfs.NDNAPILevel.Router, "mount-file").then()

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

        it("getData chunk目标对象 关联dir  有该dir权限&相应chunck 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

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
        it("getData chunk目标对象 关联dir  有该dir权限&非相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024, cyfs.NDNAPILevel.Router, "mount-dir").then()

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
        it("getData chunk目标对象 关联dir  无该dir权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file").then()

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


        it("getData chunk目标对象 关联dir reqPath 有该path权限&相应chunck 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

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
        it("getData chunk目标对象 关联dir reqPath 有该dir权限&非相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024, cyfs.NDNAPILevel.Router).then()

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
        it("getData chunk目标对象 关联dir reqPath 无该dir权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()

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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", new cyfs.AccessString(0o000)).then()

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

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()

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

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024, cyfs.NDNAPILevel.Router, "mount-file").then()

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
        it("getData chunk目标对象 关联dir+innerPath reqPath 无该path权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir", "dir", cyfs.AccessString.default()).then()

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
            assert(resp.err, `get_data 传输chunk失败`)

        })//--------------------------------------------


        it("getData file目标对象 —— —— 有file对象权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "file", new cyfs.AccessString(0o000)).then()

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

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file").then()

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

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file").then()

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
            assert(resp.err, `get_data 传输chunk失败`)

        })//--------------------------------------------------

        it("getData file目标对象 关联dir+innerPath —— 有dir对象权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

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
            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", new cyfs.AccessString(0o000)).then()

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

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()

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

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()

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
            assert(resp.err, `get_data 传输chunk失败`)

        })//---------------------------------------------------------------

        it("getData dir+innerPath目标对象 —— —— 有dir对象权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", new cyfs.AccessString(0o000)).then()

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

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()

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

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()

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

        })//---------------------------------------------------------

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
            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-chunk").then()
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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()
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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()
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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "file", new cyfs.AccessString(0o000)).then()
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

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file").then()

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
        it.only("getData chunk目标对象 关联file reqPath 无该path权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file").then()

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

        })//------------------------------------------------------------
        it("getData chunk目标对象 关联file reqPath 有该path权限&非相应chunck 获取失败", async () => {

            let { file_id, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file").then()

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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", cyfs.AccessString.default()).then()

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

            let { dir_id, inner_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024, cyfs.NDNAPILevel.Router).then()

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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024, cyfs.NDNAPILevel.Router).then()

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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024, cyfs.NDNAPILevel.Router).then()

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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", cyfs.AccessString.default()).then()

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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", new cyfs.AccessString(0o000)).then()

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

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()

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
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联dir+innerpath reqPath 有该path权限&非相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()


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
        it.skip("getData chunk目标对象 关联dir+innerPath reqPath 无该path权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()

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

        })//----------------------------------------------------------------


        it("getData file目标对象 —— —— 有file对象权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "file", new cyfs.AccessString(0o000)).then()

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

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file").then()

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
        it.skip("getData file目标对象 —— reqPath 无path对象权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file").then()

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

        })//-----------------------------------

        it("getData file目标对象 关联dir+innerPath —— 有dir对象权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", new cyfs.AccessString(0o000)).then()

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

            let { file_id, dir_id, inner_path, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()
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

        })//--------------------------------------------
        it.skip("getData file目标对象 关联dir+innerPath reqpath 无path权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()


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

        })//-------------------------------------------

        it("getData dir+innerPath目标对象 —— —— 有dir对象权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()


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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", new cyfs.AccessString(0o000)).then()

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

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()

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
        it.skip("getData dir+innerPath目标对象 —— reqpath 无path权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()

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

        })//-----------------------------------

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
            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(ZoneSimulator.zone1_device1_stack, ZoneSimulator.zone1_device1_stack, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-chunk", "chunk", cyfs.AccessString.full(), "chunk").then()

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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(ZoneSimulator.zone1_device1_stack, ZoneSimulator.zone1_device1_stack, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "file", cyfs.AccessString.full(), "file").then()
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

        })//---------------------------------------------
        it("getData chunk目标对象 关联file —— 有file对象权限&非相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()
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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "file", new cyfs.AccessString(0o000)).then()
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

        it.skip("getData chunk目标对象 关联file reqPath 有该path权限&相应chunck 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList,req_path } = await NDNTestManager.addDir(ZoneSimulator.zone1_device1_stack, ZoneSimulator.zone1_device1_stack, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file", "file", cyfs.AccessString.full(), "file").then()
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
        it.skip("getData chunk目标对象 关联file reqPath 无该path权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file").then()

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

        })//------------------------------------------------------------
        it("getData chunk目标对象 关联file reqPath 有该path权限&非相应chunck 获取失败", async () => {

            let { file_id, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file").then()

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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", cyfs.AccessString.default()).then()

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

            let { dir_id, inner_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024, cyfs.NDNAPILevel.Router).then()

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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024, cyfs.NDNAPILevel.Router).then()

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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024, cyfs.NDNAPILevel.Router).then()

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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", cyfs.AccessString.default()).then()

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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", new cyfs.AccessString(0o000)).then()

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

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()

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
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联dir+innerpath reqPath 有该path权限&非相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()


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
        it.skip("getData chunk目标对象 关联dir+innerPath reqPath 无该path权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()

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

        })//----------------------------------------------------------------


        it("getData file目标对象 —— —— 有file对象权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "file", new cyfs.AccessString(0o000)).then()

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

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file").then()

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
        it.skip("getData file目标对象 —— reqPath 无path对象权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file").then()

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

        })//-----------------------------------

        it("getData file目标对象 关联dir+innerPath —— 有dir对象权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", new cyfs.AccessString(0o000)).then()

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

            let { file_id, dir_id, inner_path, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()
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

        })//--------------------------------------------
        it.skip("getData file目标对象 关联dir+innerPath reqpath 无path权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()


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

        })//-------------------------------------------

        it("getData dir+innerPath目标对象 —— —— 有dir对象权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()


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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", new cyfs.AccessString(0o000)).then()

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

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()

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
        it.skip("getData dir+innerPath目标对象 —— reqpath 无path权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()

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

        })//-----------------------------------

    })
    describe("跨zone跨dec", function () {
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
            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-chunk").then()
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

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file", undefined, undefined, "file").then()
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
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联file —— 有file对象权限&非相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()
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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "file", new cyfs.AccessString(0o000)).then()
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

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file").then()

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
        it.skip("getData chunk目标对象 关联file reqPath 无该path权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file").then()

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

        })//------------------------------------------------------------
        it("getData chunk目标对象 关联file reqPath 有该path权限&非相应chunck 获取失败", async () => {

            let { file_id, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file").then()

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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", cyfs.AccessString.default()).then()

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

            let { dir_id, inner_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024, cyfs.NDNAPILevel.Router).then()

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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024, cyfs.NDNAPILevel.Router).then()

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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024, cyfs.NDNAPILevel.Router).then()

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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", cyfs.AccessString.default()).then()

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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", new cyfs.AccessString(0o000)).then()

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

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()

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
            assert(!resp.err, `get_data 传输chunk失败`)

        })
        it("getData chunk目标对象 关联dir+innerpath reqPath 有该path权限&非相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()


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
        it.skip("getData chunk目标对象 关联dir+innerPath reqPath 无该path权限&相应chunck 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()

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

        })//----------------------------------------------------------------


        it("getData file目标对象 —— —— 有file对象权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "file", new cyfs.AccessString(0o000)).then()

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

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file").then()

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
        it.skip("getData file目标对象 —— reqPath 无path对象权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-file").then()

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

        })//-----------------------------------

        it("getData file目标对象 关联dir+innerPath —— 有dir对象权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()

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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", new cyfs.AccessString(0o000)).then()

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

            let { file_id, dir_id, inner_path, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()
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

        })//--------------------------------------------
        it.skip("getData file目标对象 关联dir+innerPath reqpath 无path权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()


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

        })//-------------------------------------------

        it("getData dir+innerPath目标对象 —— —— 有dir对象权限 获取成功", async () => {

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router).then()


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

            let { file_id, dir_id, inner_path, chunkIdList } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, undefined, "dir", new cyfs.AccessString(0o000)).then()

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

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()

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
        it.skip("getData dir+innerPath目标对象 —— reqpath 无path权限 获取失败", async () => {

            let { file_id, dir_id, inner_path, chunkIdList, req_path } = await NDNTestManager.addDir(zone1device1, zone1device1, 1 * 1024 * 1024, 1024 * 512, cyfs.NDNAPILevel.Router, "mount-dir").then()

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

        })//-----------------------------------
    })

})