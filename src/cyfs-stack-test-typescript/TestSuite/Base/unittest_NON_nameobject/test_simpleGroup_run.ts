import * as cyfs from '../../../cyfs_node';
const assert = require("assert");
const crypto = require("crypto")


//SimpleGroup基础对象测试
describe("测试SimpleGroup对象编解码", async function () {
    let str1 = '5aUiNsqr6NL7wJxXczpU8C7wecQ7NXnPtGCrFeM12789';
    let str2 = '5aUiNsqNmYBFTeVaZcsUijQKYe3faYeTPL6STYE3i456';
    let objectid1 = cyfs.ObjectId.from_str(str1).unwrap()
    let objectid2 = cyfs.ObjectId.from_str(str2).unwrap()
    let members: cyfs.ObjectId[] = [objectid1, objectid2]
    let members1: cyfs.ObjectId[] = [objectid1]
    let members2: cyfs.ObjectId[] = []

    let publicKeystr = "/test/simpleGroup/" + "12346sdsdad132323qwe12eqw121eqwwe2wasdadd";
    let hashvalue = crypto.createHash("sha256").update(publicKeystr).digest("hex")
    let buf = new Uint8Array().fromHex(hashvalue).unwrap()
    let rsa = new cyfs.RSAPublicKey(1, buf)
    let secp = new cyfs.Secp256k1PublicKey(buf)
    // sm2 = new cyfs.SM2PublicKey(buf)
    let publicKey: cyfs.PublicKey[] = [rsa, secp]
    let publicKey1: cyfs.PublicKey[] = [rsa]
    let publicKey2: cyfs.PublicKey[] = [secp]
    //let publicKey3: cyfs.PublicKey[] = [sm2]
    let publicKey4: cyfs.PublicKey[] = []

    let dateStamp: number = new Date().getTime()
    let bigint = cyfs.JSBI.BigInt(dateStamp+1000)


    let device1 = cyfs.DeviceId.from_base_58(str1).unwrap();
    let device2 = cyfs.DeviceId.from_base_58(str2).unwrap();

    let ood_list = [device1];
    let ood_lists = [device1, device1, device1, device1, device2];
    let ood_list_e: cyfs.DeviceId[] = [];

    //OOD模式

    let ood_active_mode = cyfs.OODWorkMode.ActiveStandby
    let ood_alone_mode = cyfs.OODWorkMode.Standalone
    let ood_mode: cyfs.OODWorkMode
    let ood_mode1: cyfs.OODWorkMode


    let areastr:string = "china:guangdong:shenzhen:nanshan"
    let area:cyfs.Area = cyfs.Area.from_str(areastr).unwrap()

    //
    let udstr = '5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW111';
    let ud = new Uint8Array().fromHex(udstr).unwrap()

    let entrace_id: number = 7086

    let usimgroupid: cyfs.ObjectId
    let simgroupid1: cyfs.ObjectId

    let usimgroup: Uint8Array
    let simgroup1: Uint8Array
    let simgroup2: Uint8Array
    let simgroup3: Uint8Array
    let simgroup4: Uint8Array
    let simgroup5: Uint8Array
    let simgroup6: Uint8Array
    let simgroup7: Uint8Array
    let simgroup8: Uint8Array
    let simgroup9: Uint8Array
    let simgroup10: Uint8Array
    let simgroup11: Uint8Array
    let simgroup12: Uint8Array
    let simgroup13: Uint8Array
    let simgroup14: Uint8Array


    let udata: Uint8Array|undefined
    let traceid: number | undefined
    let updatetime: cyfs.JSBI
    let increasetime: cyfs.JSBI






    describe("编码", function () {

        it("Ts编码：正常传入有效参数创建SimpleGroup对象", function () {
            let simgroup = cyfs.SimpleGroup.create(
                1,
                publicKey,
                members,
                ood_alone_mode,
                ood_lists,
                area

            )


            usimgroupid = simgroup.simple_group_id().object_id
            usimgroup = simgroup.to_vec().unwrap()
            console.info(simgroup)
            console.info(usimgroupid)

            let [o, buf] = new cyfs.SimpleGroupDecoder().raw_decode(usimgroup).unwrap()
            let desimgroupid = o.simple_group_id()




            assert(desimgroupid, usimgroupid, "解码后的id不匹配")
        });

        it("Ts编码：创建SimpleGroup对象后设置userdata", function () {
            let simgroup = cyfs.SimpleGroup.create(
                1,
                publicKey,
                members,
                ood_alone_mode,
                ood_lists,
                area

            )

            simgroup.body_expect().set_userdata(ud)

            udata = simgroup.body_expect().user_data()
            simgroup1 = simgroup.to_vec().unwrap()
            console.info(udata)
            console.info(simgroup1)
        });

        it("Ts编码：创建SimpleGroup对象后设置trace_id", function () {
            let simgroup = cyfs.SimpleGroup.create(
                2,
                publicKey,
                members,
                ood_alone_mode,
                ood_lists,
                area

            )


            simgroup.body_expect().set_trace_id(entrace_id)
            traceid = simgroup.body_expect().trace_id()


            simgroup2 = simgroup.to_vec().unwrap()
            console.info(simgroup2)
            console.info(traceid)
            assert(entrace_id, traceid, "断言失败traceid不匹配")
        });
        it("Ts编码：创建SimpleGroup对象后修改update_time", function () {
            let simgroup = cyfs.SimpleGroup.create(
                3,
                publicKey,
                members,
                ood_alone_mode,
                ood_lists,
                area

            )

            simgroup.body_expect().set_update_time(bigint)
            updatetime = simgroup.body_expect().update_time()

            simgroup3 = simgroup.to_vec().unwrap()
            console.info(simgroup3)
            console.info(updatetime)
        });
        it("Ts编码：创建SimpleGroup对象后增加update_time", function () {
            let simgroup = cyfs.SimpleGroup.create(
                4,
                publicKey,
                members,
                ood_alone_mode,
                ood_lists,
                area

            )


            simgroup.body_expect().increase_update_time(bigint)
            increasetime = simgroup.body_expect().update_time()

            simgroup4 = simgroup.to_vec().unwrap()
            console.info(simgroup4)
            console.info(increasetime)
        });

        it("Ts编码：publicKey为rsa[]类型创建SimpleGroup对象", function () {
            let simgroup = cyfs.SimpleGroup.create(
                5,
                publicKey1,
                members,
                ood_alone_mode,
                ood_lists,
                area

            )

            simgroupid1 = simgroup.simple_group_id().object_id
            simgroup5 = simgroup.to_vec().unwrap()
            console.info(simgroup5)
            console.info(simgroupid1)
        });
        it("Ts编码：publicKey为secp[]类型创建SimpleGroup对象", function () {
            let simgroup = cyfs.SimpleGroup.create(
                6,
                publicKey2,
                members,
                ood_alone_mode,
                ood_lists,
                area

            )

            simgroupid1 = simgroup.simple_group_id().object_id
            simgroup6 = simgroup.to_vec().unwrap()
            console.info(simgroup6)
            console.info(simgroupid1)
        });
        // it.skip("Ts编码：publicKey为sm2[]类型创建SimpleGroup对象", function () {
        //     let simgroup = cyfs.SimpleGroup.create(
        //         7,
        //         publicKey3,
        //         members,
        //         ood_alone_mode,
        //         ood_lists,
        //         area

        //     )

        //     simgroupid1 = simgroup.simple_group_id().object_id
        //     simgroup7 = simgroup.to_vec().unwrap()
        //     console.info(simgroup7)
        //     console.info(simgroupid1)
        // });
        it("Ts编码：publicKey为空[]类型创建SimpleGroup对象", function () {
            let simgroup = cyfs.SimpleGroup.create(
                8,
                publicKey4,
                members,
                ood_alone_mode,
                ood_lists,
                area

            )
            simgroupid1 = simgroup.simple_group_id().object_id
            simgroup8 = simgroup.to_vec().unwrap()
            console.info(simgroup8)
            console.info(simgroupid1)
        });
        it("Ts编码：members有一个成员对象创建SimpleGroup对象", function () {
            let simgroup = cyfs.SimpleGroup.create(
                9,
                publicKey,
                members1,
                ood_alone_mode,
                ood_lists,
                area

            )
            simgroupid1 = simgroup.simple_group_id().object_id
            simgroup9 = simgroup.to_vec().unwrap()
            console.info(simgroup9)
            console.info(simgroupid1)
        });
        it("Ts编码：members为空创建SimpleGroup对象", function () {
            let simgroup = cyfs.SimpleGroup.create(
                10,
                publicKey,
                members2,
                ood_alone_mode,
                ood_lists,
                area

            )
            simgroupid1 = simgroup.simple_group_id().object_id
            simgroup10 = simgroup.to_vec().unwrap()
            console.info(simgroup10)
            console.info(simgroupid1)
        });
        it("Ts编码：创建SimpleGroup对象后OOD模式从独立设置为主备", function () {
            let simgroup = cyfs.SimpleGroup.create(
                11,
                publicKey,
                members,
                ood_alone_mode,
                ood_lists,
                area

            )
            simgroup.set_ood_work_mode(ood_active_mode)
            ood_mode = simgroup.ood_work_mode()
            simgroupid1 = simgroup.simple_group_id().object_id
            simgroup11 = simgroup.to_vec().unwrap()
            console.info(simgroup11)
            console.info(simgroupid1)
        });
        it("Ts编码：创建SimpleGroup对象后OOD模式从主备设置为独立", function () {
            let simgroup = cyfs.SimpleGroup.create(
                12,
                publicKey,
                members,
                ood_active_mode,
                ood_lists,
                area

            )
            simgroup.set_ood_work_mode(ood_alone_mode)
            ood_mode1 = simgroup.ood_work_mode()
            simgroupid1 = simgroup.simple_group_id().object_id
            simgroup12 = simgroup.to_vec().unwrap()
            console.info(simgroup12)
            console.info(simgroupid1)
        });
        it("Ts编码：创建SimpleGroup对象单个设备", function () {
            let simgroup = cyfs.SimpleGroup.create(
                13,
                publicKey,
                members,
                ood_alone_mode,
                ood_list,
                area

            )
            simgroupid1 = simgroup.simple_group_id().object_id
            simgroup13 = simgroup.to_vec().unwrap()
            console.info(simgroup13)
            console.info(simgroupid1)
        });
        it("Ts编码：创建SimpleGroup对象设备列表为空[]", function () {
            let simgroup = cyfs.SimpleGroup.create(
                14,
                publicKey,
                members,
                ood_alone_mode,
                ood_list_e,
                area

            )
            simgroupid1 = simgroup.simple_group_id().object_id
            simgroup14 = simgroup.to_vec().unwrap()
            console.info(simgroup14)
            console.info(simgroupid1)
        });
    });



    describe("解码", async function () {
        it("Ts解码: 对有效已编码对象total为num进行解码", async function () {
            let [o, buf] = new cyfs.SimpleGroupDecoder().raw_decode(usimgroup).unwrap()
            let desimgroupid = o.simple_group_id()




            assert(desimgroupid, usimgroupid, "解码后的id不匹配")
        });

        //
        it("Ts解码: 对设置好userdata已编码对象进行解码", async function () {
            let [o, buf] = new cyfs.SimpleGroupDecoder().raw_decode(simgroup1).unwrap()
            let deudata = o.body_expect().user_data()
            let desimgroupid = o.simple_group_id()




            assert(desimgroupid, usimgroupid, "解码后的id不匹配")

            assert(udata, deudata, "解码后的数据不匹配")

        });
        it("Ts解码: 对设置好trace_id已编码对象进行解码", async function () {
            let [o, buf] = new cyfs.SimpleGroupDecoder().raw_decode(simgroup2).unwrap()
            let detraceid = o.body_expect().trace_id()

            let desimgroupid = o.simple_group_id()




            assert(desimgroupid, usimgroupid, "解码后的id不匹配")


            assert(traceid, detraceid, "解码后的数据不匹配")
        });

        it("Ts解码: 对设置好updatetime已编码对象进行解码", async function () {
            let [o, buf] = new cyfs.SimpleGroupDecoder().raw_decode(simgroup3).unwrap()
            let deupdatetime = o.body_expect().update_time()

            let desimgroupid = o.simple_group_id()




            assert(desimgroupid, usimgroupid, "解码后的id不匹配")


            assert(updatetime, deupdatetime, "解码后的数据不匹配")
        });
        it("Ts解码: 对新增好updatetime已编码对象进行解码", async function () {
            let [o, buf] = new cyfs.SimpleGroupDecoder().raw_decode(simgroup4).unwrap()
            let deupdatetime = o.body_expect().update_time()

            let desimgroupid = o.simple_group_id()




            assert(desimgroupid, usimgroupid, "解码后的id不匹配")


            assert(increasetime, deupdatetime, "解码后的数据不匹配")
        });
        it("Ts解码: publicKey为rsa[]类型创建SimpleGroup对象", async function () {
            let [o, buf] = new cyfs.SimpleGroupDecoder().raw_decode(simgroup5).unwrap()
    
            let desimgroupid = o.simple_group_id()
            o.desc().public_key()

            assert(desimgroupid, simgroupid1, "解码后的id不匹配")

        });
        it("Ts解码: publicKey为secp[]类型创建SimpleGroup对象", async function () {
            let [o, buf] = new cyfs.SimpleGroupDecoder().raw_decode(simgroup6).unwrap()
    
            let desimgroupid = o.simple_group_id()

            assert(desimgroupid, simgroupid1, "解码后的id不匹配")

        });
        // it("Ts解码: publicKey为sm2[]类型创建SimpleGroup对象", async function () {
        //     let [o, buf] = new cyfs.SimpleGroupDecoder().raw_decode(simgroup7).unwrap()
    
        //     let desimgroupid = o.simple_group_id()

        //     assert(desimgroupid, simgroupid1, "解码后的id不匹配")

        // });
        it("Ts解码: publicKey为空[]类型创建SimpleGroup对象", async function () {
            let [o, buf] = new cyfs.SimpleGroupDecoder().raw_decode(simgroup8).unwrap()
    
            let desimgroupid = o.simple_group_id()

            assert(desimgroupid, simgroupid1, "解码后的id不匹配")

        });
        it("Ts解码: members有一个成员对象创建SimpleGroup对象", async function () {
            let [o, buf] = new cyfs.SimpleGroupDecoder().raw_decode(simgroup9).unwrap()
    
            let desimgroupid = o.simple_group_id()
            let demembder = o.body_expect().content().members

            assert(desimgroupid, simgroupid1, "解码后的id不匹配")
            assert(demembder, members1, "解码后的id不匹配")

        });
        it("Ts解码: members为空创建SimpleGroup对象", async function () {
            let [o, buf] = new cyfs.SimpleGroupDecoder().raw_decode(simgroup10).unwrap()
    
            let desimgroupid = o.simple_group_id()
            let demembder = o.body_expect().content().members

            assert(desimgroupid, simgroupid1, "解码后的id不匹配")
            assert(demembder, members2, "解码后的id不匹配")

        });
        it("Ts解码: 创建SimpleGroup对象后OOD模式从独立设置为主备", async function () {
            let [o, buf] = new cyfs.SimpleGroupDecoder().raw_decode(simgroup11).unwrap()
    
            let desimgroupid = o.simple_group_id()
            let deoodmode = o.body_expect().content().ood_work_mode()

            assert(desimgroupid, simgroupid1, "解码后的id不匹配")
            assert(deoodmode, ood_mode, "解码后的id不匹配")

        });
        it("Ts解码: 创建SimpleGroup对象后OOD模式从独立设置为主备", async function () {
            let [o, buf] = new cyfs.SimpleGroupDecoder().raw_decode(simgroup12).unwrap()
    
            let desimgroupid = o.simple_group_id()
            let deoodmode = o.body_expect().content().ood_work_mode()

            assert(desimgroupid, simgroupid1, "解码后的id不匹配")
            assert(deoodmode, ood_mode1, "解码后的id不匹配")

        });

        it("Ts解码: 创建SimpleGroup对象单个设备", async function () {
            let [o, buf] = new cyfs.SimpleGroupDecoder().raw_decode(simgroup13).unwrap()
    
            let desimgroupid = o.simple_group_id()
            let deoodlist = o.body_expect().content().ood_list

            assert(desimgroupid, simgroupid1, "解码后的id不匹配")
            assert(deoodlist, ood_list, "解码后的id不匹配")

        });
        it("Ts解码: 创建SimpleGroup对象设备列表为空[]", async function () {
            let [o, buf] = new cyfs.SimpleGroupDecoder().raw_decode(simgroup14).unwrap()
    
            let desimgroupid = o.simple_group_id()
            let deoodlist = o.body_expect().content().ood_list

            assert(desimgroupid, simgroupid1, "解码后的id不匹配")
            assert(deoodlist, ood_list_e, "解码后的id不匹配")

        });
        
    });
})  