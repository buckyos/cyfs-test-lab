import assert from 'assert';
import * as cyfs from '../../cyfs_node';
import { ZoneSimulator, get_len_buf } from "../../common/utils";
import * as myHandler from "./handler"

//初始化日志
cyfs.clog.enable_file_log({
    name: "test_custom_objectId",
    dir: cyfs.get_app_log_dir("unittest_stack_interface"),
    file_max_size: 1024 * 1024 * 10,
    file_max_count: 10,
});
``

async function customObjectId(data: string) {
    let id = cyfs.ObjectId.from_string_as_data(data).unwrap()
    console.log(`自定义数据objectId为： ${id}`)
    assert(id.is_data(), "---->>>不是data!")
    assert(!id.is_standard_object(), "---->>>应该不是标准对象才对!")
    assert(!id.is_core_object(), "---->>>应该不是核心对象才对!")
    assert(!id.is_dec_app_object(), "---->>>应该不是decapp对象才对!")
    console.log(`data ${id.to_string()} len is ${id.data_len()} `)

    let data2 = id.data();
    assert(data2.byteLength == new TextEncoder().encode(data).byteLength, "字节长度不相等")
    //assert(data2==new TextEncoder().encode(data),"buffer不相等")
    assert(id.data_as_string() == data, '解码后字符串不一样')
    console.log(`自定义数据objectId通过`)
    return id
}



let zone1device1: cyfs.SharedCyfsStack;
let zone1device2: cyfs.SharedCyfsStack;
let zone1ood: cyfs.SharedCyfsStack
let zone1sood: cyfs.SharedCyfsStack

let zone2ood: cyfs.SharedCyfsStack
let zone2device1: cyfs.SharedCyfsStack
let zone2device2: cyfs.SharedCyfsStack
let system_stack: cyfs.SharedCyfsStack

let zone1device1_dec_id: cyfs.ObjectId
let zone1device2_dec_id: cyfs.ObjectId
let zone1ooddec_id: cyfs.ObjectId

let zone2ooddec_id: cyfs.ObjectId
let zone2device1_dec_id: cyfs.ObjectId
let zone2device2_dec_id: cyfs.ObjectId

let sysdec: cyfs.ObjectId



describe("ObjectId自定义相关接口测试", function () {
    this.timeout(0);
    this.beforeAll(async function () {

        await ZoneSimulator.init(false,false,' RDP-Tcp',"http");
        zone1device1_dec_id = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device1decapp")
        zone1device2_dec_id = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1device2decapp")
        zone1ooddec_id = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone1ooddecapp")
        zone2ooddec_id = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone2ooddecapp")
        zone2device1_dec_id = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone2device1decapp")
        zone2device2_dec_id = cyfs.DecApp.generate_id(cyfs.ObjectId.default(), "zone2device2decapp")

        zone1device1 = ZoneSimulator.zone1_device1_stack!.fork_with_new_dec(zone1device1_dec_id)
        zone1device2 = ZoneSimulator.zone1_device2_stack!.fork_with_new_dec(zone1device2_dec_id);
        zone1ood = ZoneSimulator.zone1_ood_stack!.fork_with_new_dec(zone1ooddec_id);
        zone1sood = ZoneSimulator.zone1_standby_ood_stack

        zone2ood = ZoneSimulator.zone2_ood_stack!.fork_with_new_dec(zone2ooddec_id);
        zone2device1 = ZoneSimulator.zone2_device1_stack!.fork_with_new_dec(zone2device1_dec_id);
        zone2device2 = ZoneSimulator.zone2_device2_stack!.fork_with_new_dec(zone2device2_dec_id);
        sysdec = cyfs.get_system_dec_app().object_id
        // console.log("-----------------------------------=-=-=-=-=-===-a" + zone1device1_dec_id)
        // console.log("-----------------------------------=-=-=-=-=-===-b" + ZoneSimulator.zone1_device1_stack.dec_id)

        system_stack = ZoneSimulator.zone1_device1_stack.fork_with_new_dec(sysdec)

    })
    this.afterAll(async () => {
        console.info(`#########用例执行完成`);
        ZoneSimulator.clearZoneSimulator();
        //process.exit(0)
    })

    describe("数据内容测试", async () => {
        beforeEach(async function () {
        })
        afterEach(async function () {
        })
        it("冒烟", async () => {
            let result = await customObjectId("hello!!! first id")
            console.log(`____________________ ${result}`)
            assert(result.is_data, 'is not data')
        })
        it("带特殊符号空格", async () => {
            let result = await customObjectId("hello!!!！￥# ）-———")
            console.log(`____________________ ${result}`)
            assert(result.is_data, 'is not data')
        })
        it("带中文", async () => {
            let result = await customObjectId("hello你好世界")
            console.log(`____________________ ${result}`)
            assert(result.is_data, 'is not data')
        })
        it("data长度超过31", async () => {
            let result :any =0
            try {
                result = await customObjectId("hello!!!！￥# ）-——")
                console.log(`____________________ ${result}`)
            } catch (err) { console.log(err) }
            assert(result!=0,"长度超过31")
        })
        it("data长度为1", async () => {
            let result :any =0
            try {
                result = await customObjectId("h")
                console.log(`____________________ ${result}`)
            } catch (err) { console.log(err) }
            assert(result!=0,"长度超过31")
        })
        it("data长度为0", async () => {
            let result :any =0
            try {
                result = await customObjectId("")
                console.log(`____________________ ${result}`)
            } catch (err) { console.log(err) }
            assert(result!=0,"长度超过31")
        })
        it("data为纯数字", async () => {
            let result :any =0
            try {
                result = await customObjectId("123456789")
                console.log(`____________________ ${result}`)
            } catch (err) { console.log(err) }
            assert(result!=0,"长度超过31")
        })
        it("data为纯英文", async () => {
            let result :any =0
            try {
                result = await customObjectId("Asdgdfgdgfhfh")
                console.log(`____________________ ${result}`)
            } catch (err) { console.log(err) }
            assert(result!=0,"长度超过31")
        })
        it("data为中文", async () => {
            let result :any =0
            try {
                result = await customObjectId("你好，世界！")
                console.log(`____________________ ${result}`)
            } catch (err) { console.log(err) }
            assert(result!=0,"长度超过31")
        })
        it("data为—— ", async () => {
            let result :any =0
            try {
                result = await customObjectId("—— ")
                console.log(`____________________ ${result}`)
            } catch (err) { console.log(err) }
            assert(result!=0,"长度超过31")
        })
        it("data为一个路径 ", async () => {
            let result :any =0
            try {
                result = await customObjectId("/test/inner_path")
                console.log(`____________________ ${result}`)
            } catch (err) { console.log(err) }
            assert(result!=0,"长度超过31")
        })
    })
    describe("ObjectMap相关测试", async () => {
        beforeEach(async function () {
            await zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).clear_access()
        })
        afterEach(async function () {
            await zone1device2.root_state_meta_stub(zone1device1.local_device_id().object_id, zone1device1_dec_id).clear_access()
           
        })
        it("冒烟", async () => {
            let result = await customObjectId("hello!!! first id")
            console.log(`____________________ ${result}`)
            assert(result.is_data, 'is not data')
        })
        it("带特殊符号空格", async () => {
            let result = await customObjectId("hello!!!！￥# ）-———")
            console.log(`____________________ ${result}`)
            assert(result.is_data, 'is not data')
        })
        it("带中文", async () => {
            let result = await customObjectId("hello你好世界")
            console.log(`____________________ ${result}`)
            assert(result.is_data, 'is not data')
        })
        it("data长度超过31", async () => {
            let result :any =0
            try {
                result = await customObjectId("hello!!!！￥# ）-——")
                console.log(`____________________ ${result}`)
            } catch (err) { console.log(err) }
            assert(result!=0,"长度超过31")
        })
        it("data长度为1", async () => {
            let result :any =0
            try {
                result = await customObjectId("h")
                console.log(`____________________ ${result}`)
            } catch (err) { console.log(err) }
            assert(result!=0,"长度超过31")
        })
        it("data长度为0", async () => {
            let result :any =0
            try {
                result = await customObjectId("")
                console.log(`____________________ ${result}`)
            } catch (err) { console.log(err) }
            assert(result!=0,"长度超过31")
        })
        it("data为纯数字", async () => {
            let result :any =0
            try {
                result = await customObjectId("123456789")
                console.log(`____________________ ${result}`)
            } catch (err) { console.log(err) }
            assert(result!=0,"长度超过31")
        })
        it("data为纯英文", async () => {
            let result :any =0
            try {
                result = await customObjectId("Asdgdfgdgfhfh")
                console.log(`____________________ ${result}`)
            } catch (err) { console.log(err) }
            assert(result!=0,"长度超过31")
        })
        it("data为中文", async () => {
            let result :any =0
            try {
                result = await customObjectId("你好，世界！")
                console.log(`____________________ ${result}`)
            } catch (err) { console.log(err) }
            assert(result!=0,"长度超过31")
        })
        it("data为—— ", async () => {
            let result :any =0
            try {
                result = await customObjectId("—— ")
                console.log(`____________________ ${result}`)
            } catch (err) { console.log(err) }
            assert(result!=0,"长度超过31")
        })
       
    })
})