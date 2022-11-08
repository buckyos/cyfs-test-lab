import assert = require('assert');
import {cyfs} from '../../cyfs_node'
import { ZoneSimulator } from "../../common/utils";



//初始化日志
cyfs.clog.enable_file_log({
    name: "unittest_stack_interface",
    dir: cyfs.get_app_log_dir("unittest_stack_interface"),
    file_max_size: 1024 * 1024 * 10,
    file_max_count: 10,
});
let zone1device1: cyfs.SharedCyfsStack;
let zone1device2: cyfs.SharedCyfsStack;
let zone1ood: cyfs.SharedCyfsStack

let zone2ood: cyfs.SharedCyfsStack
let zone2device1: cyfs.SharedCyfsStack

let zone1device1_dec_id: cyfs.ObjectId
let zone1device2_dec_id: cyfs.ObjectId
let zone1ooddec_id: cyfs.ObjectId

let zone2ooddec_id: cyfs.ObjectId
let zone2device1_dec_id: cyfs.ObjectId


describe("SharedCyfsStack util相关接口测试", function () {
    this.timeout(0);

    this.beforeAll(async function () {
        //测试前置条件，连接测试模拟器设备
        console.info(`##########用例执开始执行`);
        await ZoneSimulator.init();
        zone1device1_dec_id = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device1decapp")
        zone1device2_dec_id = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device2decapp")
        zone1ooddec_id = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1ooddecapp")

        zone2ooddec_id = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone2ooddecapp")
        zone2device1_dec_id = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone2device1decapp")

        zone1device1 = ZoneSimulator.zone1_device1_stack!.fork_with_new_dec(zone1device1_dec_id)
        zone1device2 = ZoneSimulator.zone1_device2_stack!.fork_with_new_dec(zone1device2_dec_id);
        zone1ood = ZoneSimulator.zone1_ood_stack!.fork_with_new_dec(zone1ooddec_id);

        zone2ood = ZoneSimulator.zone2_ood_stack!.fork_with_new_dec(zone2ooddec_id);
        zone2device1 = ZoneSimulator.zone2_device1_stack!.fork_with_new_dec(zone2device1_dec_id);

        // console.log("-----------------------------------=-=-=-=-=-===-" + sysdec)


    })
    this.afterAll(async () => {
        //每个函数执行前，清除所有handler
        console.info(`#########用例执行完成`);
        ZoneSimulator.stopZoneSimulator();
        //console.info(JSON.stringify(this.suites))
        //console.info(this.tests)

        //process.exit(0);

    })

    describe("unit接口白盒测试", async () => {
        describe("unit 接口 get_device", async () => {
            it("runtime接口正常调用", async () => {
                let run = await zone1device1.util().get_device({ common: { req_path: undefined, dec_id: undefined, target: undefined, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("runtime接口zone内不同设备间调用", async () => {
                let run = await zone1device1.util().get_device({ common: { req_path: undefined, dec_id: undefined, target: zone1device2.local_device_id().object_id, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("runtime接口zone内同dec间调用", async () => {
                let run = await zone1device1.util().get_device({ common: { req_path: undefined, dec_id: zone1device1_dec_id, target: undefined, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("runtime接口zone内不同dec间调用", async () => {
                let run = await zone1device1.util().get_device({ common: { req_path: undefined, dec_id: zone1device2_dec_id, target: undefined, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("ood接口正常调用", async () => {
                let run = await zone1ood.util().get_device({ common: { req_path: undefined, dec_id: undefined, target: undefined, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("ood接口不同设备间调用", async () => {
                let run = await zone1ood.util().get_device({ common: { req_path: undefined, dec_id: undefined, target: zone1device2.local_device_id().object_id, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("runtime接口跨zone调用", async () => {
                let run = await zone1device1.util().get_device({ common: { req_path: undefined, dec_id: undefined, target: zone2device1.local_device_id().object_id, flags: 0 } })
                assert(run.err, `调用接口跨zone成功了:${run}`)

            })
            it("ood接口跨zone调用", async () => {
                let run = await zone1ood.util().get_device({ common: { req_path: undefined, dec_id: undefined, target: zone2ood.local_device_id().object_id, flags: 0 } })
                assert(run.err, `调用接口跨zone成功了:${run}`)
            })
        })
        describe("unit 接口 get_zone", async () => {
            it("runtime接口正常调用", async () => {
                let run = await zone2device1.util().get_zone({ common: { flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("runtime接口zone内不同设备间调用", async () => {
                let run = await zone1device1.util().get_zone({common: { req_path: undefined, dec_id: undefined, target: zone1device2.local_device_id().object_id, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("runtime接口zone内同dec间调用", async () => {
                let run = await zone1device1.util().get_zone({ common: { req_path: undefined, dec_id: zone1device1_dec_id, target: undefined, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("runtime接口zone内不同dec间调用", async () => {
                let run = await zone1device1.util().get_zone({ common: { req_path: undefined, dec_id: zone1device2_dec_id, target: undefined, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("ood接口正常调用", async () => {
                let run = await zone1ood.util().get_zone({ common: { req_path: undefined, dec_id: undefined, target: undefined, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("ood接口不同设备间调用", async () => {
                let run = await zone1ood.util().get_zone({ common: { req_path: undefined, dec_id: undefined, target: zone1device2.local_device_id().object_id, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("runtime接口跨zone调用", async () => {
                let run = await zone1device1.util().get_zone({ common: { req_path: undefined, dec_id: undefined, target: zone2device1.local_device_id().object_id, flags: 0 } })
                assert(run.err, `调用接口跨zone成功了:${run}`)
            })
            it("ood接口跨zone调用", async () => {
                let run = await zone1ood.util().get_zone({ common: { req_path: undefined, dec_id: undefined, target: zone2ood.local_device_id().object_id, flags: 0 } })
                assert(run.err, `调用接口跨zone成功了:${run}`)
            })
        })
        describe("unit 接口 resolve_ood", async () => {
            it("runtime接口正常调用", async () => {
                let run = await zone2ood.util().resolve_ood({ object_id: zone2ood.local_device_id().object_id, common: { flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
           
            it("runtime接口zone内不同设备间调用", async () => {
                let run = await zone1device1.util().resolve_ood({object_id: zone1device2.local_device_id().object_id,common: { req_path: undefined, dec_id: undefined, target: zone1device2.local_device_id().object_id, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("runtime接口zone内同dec间调用", async () => {
                let run = await zone1device1.util().resolve_ood({ object_id: zone1device1.local_device_id().object_id,common: { req_path: undefined, dec_id: zone1device1_dec_id, target: undefined, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("runtime接口zone内不同dec间调用", async () => {
                let run = await zone1device1.util().resolve_ood({ object_id: zone1device2.local_device_id().object_id,common: { req_path: undefined, dec_id: zone1device2_dec_id, target: undefined, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("ood接口正常调用", async () => {
                let run = await zone1ood.util().resolve_ood({ object_id: zone1ood.local_device_id().object_id,common: { req_path: undefined, dec_id: undefined, target: undefined, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("ood接口不同设备间调用", async () => {
                let run = await zone1ood.util().resolve_ood({ object_id: zone1device2.local_device_id().object_id,common: { req_path: undefined, dec_id: undefined, target: zone1device2.local_device_id().object_id, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("runtime接口跨zone调用", async () => {
                let run = await zone1device1.util().resolve_ood({ object_id: zone2device1.local_device_id().object_id,common: { req_path: undefined, dec_id: undefined, target: zone2device1.local_device_id().object_id, flags: 0 } })
                assert(run.err, `调用接口跨zone成功了:${run}`)
            })
            it("ood接口跨zone调用", async () => {
                let run = await zone1ood.util().resolve_ood({ object_id: zone2ood.local_device_id().object_id,common: { req_path: undefined, dec_id: undefined, target: zone2ood.local_device_id().object_id, flags: 0 } })
                assert(run.err, `调用接口跨zone成功了:${run}`)
            })
           
        })
        describe("unit 接口 get_ood_status", async () => {
            it("runtime接口正常调用", async () => {
                let run = await zone1device1.util().get_ood_status({ common: { flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("runtime接口zone内不同设备间调用", async () => {
                let run = await zone1device1.util().get_ood_status({ common: { req_path: undefined, dec_id: undefined, target: zone1device2.local_device_id().object_id, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("runtime接口zone内同dec间调用", async () => {
                let run = await zone1device1.util().get_ood_status({ common: { req_path: undefined, dec_id: zone1device1_dec_id, target: undefined, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("runtime接口zone内不同dec间调用", async () => {
                let run = await zone1device1.util().get_ood_status({ common: { req_path: undefined, dec_id: zone1device2_dec_id, target: undefined, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("ood上调用指定其他设备获取所在ood状态", async () => {
                let run = await zone1ood.util().get_ood_status({ common: { req_path: undefined, dec_id: undefined, target: zone1device2.local_device_id().object_id, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it.skip("ood上调用自己的状态", async () => {
                let run = await zone1ood.util().get_ood_status({ common: { req_path: undefined, dec_id: undefined, target: undefined, flags: 0 } })
                assert(!run.unwrap().status.ood_device_id, `调用接口成功:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            }) //6, sync client is not support on ood or not enabled for current device!
            it("ood接口不同设备间调用", async () => {
                let run = await zone1ood.util().get_ood_status({ common: { req_path: undefined, dec_id: undefined, target: zone1device2.local_device_id().object_id, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("runtime接口跨zone调用", async () => {
                let run = await zone1device1.util().get_ood_status({ common: { req_path: undefined, dec_id: undefined, target: zone2device1.local_device_id().object_id, flags: 0 } })
                assert(run.err, `调用接口跨zone成功了:${run}`)

            })
            it("ood接口跨zone调用", async () => {
                let run = await zone1ood.util().get_ood_status({ common: { req_path: undefined, dec_id: undefined, target: zone2ood.local_device_id().object_id, flags: 0 } })
                assert(run.err, `调用接口跨zone成功了:${run}`)
            })
        })
        describe("unit 接口 get_noc_info", async () => {
            it("runtime接口正常调用", async () => {
                let run = await zone1device1.util().get_noc_info({ common: { flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("runtime接口zone内不同设备间调用", async () => {
                let run = await zone1device1.util().get_noc_info({ common: { req_path: undefined, dec_id: undefined, target: zone1device2.local_device_id().object_id, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("runtime接口zone内同dec间调用", async () => {
                let run = await zone1device1.util().get_noc_info({ common: { req_path: undefined, dec_id: zone1device1_dec_id, target: undefined, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("runtime接口zone内不同dec间调用", async () => {
                let run = await zone1device1.util().get_noc_info({ common: { req_path: undefined, dec_id: zone1device2_dec_id, target: undefined, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("ood接口正常调用", async () => {
                let run = await zone1ood.util().get_noc_info({ common: { req_path: undefined, dec_id: undefined, target: undefined, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("ood接口不同设备间调用", async () => {
                let run = await zone1ood.util().get_noc_info({ common: { req_path: undefined, dec_id: undefined, target: zone1device2.local_device_id().object_id, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("runtime接口跨zone调用", async () => {
                let run = await zone1device1.util().get_noc_info({ common: { req_path: undefined, dec_id: undefined, target: zone2device1.local_device_id().object_id, flags: 0 } })
                assert(run.err, `调用接口跨zone成功了:${run}`)

            })
            it("ood接口跨zone调用", async () => {
                let run = await zone1ood.util().get_noc_info({ common: { req_path: undefined, dec_id: undefined, target: zone2ood.local_device_id().object_id, flags: 0 } })
                assert(run.err, `调用接口跨zone成功了:${run}`)
            })
        })
        describe("unit 接口 get_network_access_info", async () => {
            it("runtime接口正常调用", async () => {
                let run = await zone1device1.util().get_network_access_info({ common: { flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("runtime接口zone内不同设备间调用", async () => {
                let run = await zone1device1.util().get_network_access_info({ common: { req_path: undefined, dec_id: undefined, target: zone1device2.local_device_id().object_id, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("runtime接口zone内同dec间调用", async () => {
                let run = await zone1device1.util().get_network_access_info({ common: { req_path: undefined, dec_id: zone1device1_dec_id, target: undefined, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("runtime接口zone内不同dec间调用", async () => {
                let run = await zone1device1.util().get_network_access_info({ common: { req_path: undefined, dec_id: zone1device2_dec_id, target: undefined, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("ood接口正常调用", async () => {
                let run = await zone1ood.util().get_network_access_info({ common: { req_path: undefined, dec_id: undefined, target: undefined, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("ood接口不同设备间调用", async () => {
                let run = await zone1ood.util().get_network_access_info({ common: { req_path: undefined, dec_id: undefined, target: zone1device2.local_device_id().object_id, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("runtime接口跨zone调用", async () => {
                let run = await zone1device1.util().get_network_access_info({ common: { req_path: undefined, dec_id: undefined, target: zone2device1.local_device_id().object_id, flags: 0 } })
                assert(run.err, `调用接口跨zone成功了:${run}`)

            })
            it("ood接口跨zone调用", async () => {
                let run = await zone1ood.util().get_network_access_info({ common: { req_path: undefined, dec_id: undefined, target: zone2ood.local_device_id().object_id, flags: 0 } })
                assert(run.err, `调用接口跨zone成功了:${run}`)
            })
        })
        describe("unit 接口 get_device_static_info", async () => {
            it("runtime接口正常调用", async () => {
                let run = await zone1device1.util().get_device_static_info({ common: { flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("runtime接口zone内不同设备间调用", async () => {
                let run = await zone1device1.util().get_device_static_info({ common: { req_path: undefined, dec_id: undefined, target: zone1device2.local_device_id().object_id, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("runtime接口zone内同dec间调用", async () => {
                let run = await zone1device1.util().get_device_static_info({ common: { req_path: undefined, dec_id: zone1device1_dec_id, target: undefined, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("runtime接口zone内不同dec间调用", async () => {
                let run = await zone1device1.util().get_device_static_info({ common: { req_path: undefined, dec_id: zone1device2_dec_id, target: undefined, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("ood接口正常调用", async () => {
                let run = await zone1ood.util().get_device_static_info({ common: { req_path: undefined, dec_id: undefined, target: undefined, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("ood接口不同设备间调用", async () => {
                let run = await zone1ood.util().get_device_static_info({ common: { req_path: undefined, dec_id: undefined, target: zone1device2.local_device_id().object_id, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("runtime接口跨zone调用", async () => {
                let run = await zone1device1.util().get_device_static_info({ common: { req_path: undefined, dec_id: undefined, target: zone2device1.local_device_id().object_id, flags: 0 } })
                assert(run.err, `调用接口跨zone成功了:${run}`)

            })
            it("ood接口跨zone调用", async () => {
                let run = await zone1ood.util().get_device_static_info({ common: { req_path: undefined, dec_id: undefined, target: zone2ood.local_device_id().object_id, flags: 0 } })
                assert(run.err, `调用接口跨zone成功了:${run}`)
            })
        })
        describe("unit 接口 get_system_info", async () => {
            it("runtime接口正常调用", async () => {
                let run = await zone1device1.util().get_system_info({ common: { flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("runtime接口zone内不同设备间调用", async () => {
                let run = await zone1device1.util().get_system_info({ common: { req_path: undefined, dec_id: undefined, target: zone1device2.local_device_id().object_id, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("runtime接口zone内同dec间调用", async () => {
                let run = await zone1device1.util().get_system_info({ common: { req_path: undefined, dec_id: zone1device1_dec_id, target: undefined, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("runtime接口zone内不同dec间调用", async () => {
                let run = await zone1device1.util().get_system_info({ common: { req_path: undefined, dec_id: zone1device2_dec_id, target: undefined, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("ood接口正常调用", async () => {
                let run = await zone1ood.util().get_system_info({ common: { req_path: undefined, dec_id: undefined, target: undefined, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("ood接口不同设备间调用", async () => {
                let run = await zone1ood.util().get_system_info({ common: { req_path: undefined, dec_id: undefined, target: zone1device2.local_device_id().object_id, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("runtime接口跨zone调用", async () => {
                let run = await zone1device1.util().get_system_info({ common: { req_path: undefined, dec_id: undefined, target: zone2device1.local_device_id().object_id, flags: 0 } })
                assert(run.err, `调用接口跨zone成功了:${run}`)

            })
            it("ood接口跨zone调用", async () => {
                let run = await zone1ood.util().get_system_info({ common: { req_path: undefined, dec_id: undefined, target: zone2ood.local_device_id().object_id, flags: 0 } })
                assert(run.err, `调用接口跨zone成功了:${run}`)
            })
        })
        describe("unit 接口 get_version_info", async () => {
            it("runtime接口正常调用", async () => {
                let run = await zone1device1.util().get_version_info({ common: { flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("runtime接口正常调用", async () => {
                let run = await zone1device1.util().get_version_info({ common: { req_path: undefined, dec_id: undefined, target: undefined, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("runtime接口zone内不同设备间调用", async () => {
                let run = await zone1device1.util().get_version_info({ common: { req_path: undefined, dec_id: undefined, target: zone1device2.local_device_id().object_id, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("runtime接口zone内同dec间调用", async () => {
                let run = await zone1device1.util().get_version_info({ common: { req_path: undefined, dec_id: zone1device1_dec_id, target: undefined, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("runtime接口zone内不同dec间调用", async () => {
                let run = await zone1device1.util().get_version_info({ common: { req_path: undefined, dec_id: zone1device2_dec_id, target: undefined, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("ood接口正常调用", async () => {
                let run = await zone1ood.util().get_version_info({ common: { req_path: undefined, dec_id: undefined, target: undefined, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("ood接口不同设备间调用", async () => {
                let run = await zone1ood.util().get_version_info({ common: { req_path: undefined, dec_id: undefined, target: zone1device2.local_device_id().object_id, flags: 0 } })
                assert(!run.err, `调用接口失败:${run}`)
                console.info(`${JSON.stringify(run.unwrap())}`)
            })
            it("runtime接口跨zone调用", async () => {
                let run = await zone1device1.util().get_version_info({ common: { req_path: undefined, dec_id: undefined, target: zone2device1.local_device_id().object_id, flags: 0 } })
                assert(run.err, `调用接口跨zone成功了:${run}`)

            })
            it("ood接口跨zone调用", async () => {
                let run = await zone1ood.util().get_version_info({ common: { req_path: undefined, dec_id: undefined, target: zone2ood.local_device_id().object_id, flags: 0 } })
                assert(run.err, `调用接口跨zone成功了:${run}`)
            })
        })
        describe("unit 接口 build_dir_from_object_map", async () => {

        })
    })



})

