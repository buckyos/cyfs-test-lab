import * as cyfs from '../../../cyfs_node';
var assert = require("assert");
const crypto = require("crypto")


//Contract基础对象测试
describe("测试Contract对象编解码", async function () {
    let packagevaluestr = "/test/contract/"+"12346sdsdad132323qwe12eqw121eqwwe2wasdadd";
    let hashvalue =crypto.createHash("sha256").update(packagevaluestr).digest("hex")
    let packagevalue = cyfs.HashValue.from_hex_string(hashvalue).unwrap()
     

    let contractid: cyfs.ContractId


    //
    let udstr = '5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW111';
    let ud = new Uint8Array().fromHex(udstr).unwrap()
    let dateStamp: number = new Date().getTime()
    let bigint = cyfs.JSBI.BigInt(dateStamp)
    let entrace_id: number = 7086

    let ucontract: Uint8Array
    let contract1: Uint8Array
    let contract2: Uint8Array
    let contract3: Uint8Array
    let contract4: Uint8Array

    let udata: Uint8Array|undefined
    let traceid: number | undefined
    let updatetime: cyfs.JSBI
    let increasetime: cyfs.JSBI

    describe("编码", function () {

        it("Ts编码：正常传入有效参数创建action对象", function () {
            let contract = cyfs.Contract.create(
                packagevalue,
                undefined

            )

            contractid = contract.contract_id()
            ucontract = contract.to_vec().unwrap()
            console.info(contract)
            console.info(contractid)
        });

        it("Ts编码：创建contract对象后设置userdata", function () {
            let contract = cyfs.Contract.create(
                packagevalue,
                undefined

            )

            contract.body_expect().set_userdata(ud)

            udata = contract.body_expect().user_data()
            contract1 = contract.to_vec().unwrap()
            console.info(udata)
            console.info(contract1)
        });

        it("Ts编码：创建contract对象后设置trace_id", function () {
            let contract = cyfs.Contract.create(
                packagevalue,
                undefined

            )


            contract.body_expect().set_trace_id(entrace_id)
            traceid = contract.body_expect().trace_id()


            contract2 = contract.to_vec().unwrap()
            console.info(contract)
            console.info(traceid)
            assert(entrace_id, traceid, "断言失败traceid不匹配")
        });
        it("Ts编码：创建contract对象后修改update_time", function () {
            let contract = cyfs.Contract.create(
                packagevalue,
                undefined

            )


            contract.body_expect().set_update_time(bigint)
            updatetime = contract.body_expect().update_time()

            contract3 = contract.to_vec().unwrap()
            console.info(contract)
            console.info(updatetime)
        });
        it("Ts编码：创建contract对象后增加update_time", function () {
            let contract = cyfs.Contract.create(
                packagevalue,
                undefined

            )


            contract.body_expect().increase_update_time(bigint)
            increasetime = contract.body_expect().update_time()

            contract4 = contract.to_vec().unwrap()
            console.info(contract)
            console.info(increasetime)
        });

    });



    describe("解码", async function () {
        it("Ts解码: 对有效已编码对象进行解码", async function () {
            let [o, buf] = new cyfs.ContractDecoder().raw_decode(ucontract).unwrap()
            let decontractid = o.contract_id()




            assert(decontractid, contractid, "解码后的id不匹配")
        });
        //
        it("Ts解码: 对设置好userdata已编码对象进行解码", async function () {
            let [o, buf] = new cyfs.ContractDecoder().raw_decode(contract1).unwrap()
            let deudata = o.body_expect().user_data()
            let decontractid = o.contract_id()



            assert(decontractid, contractid, "解码后的id不匹配")

            assert(udata, deudata, "解码后的数据不匹配")

        });
        it("Ts解码: 对设置好trace_id已编码对象进行解码", async function () {
            let [o, buf] = new cyfs.ContractDecoder().raw_decode(contract2).unwrap()
            let detraceid = o.body_expect().trace_id()

            let decontractid = o.contract_id()



            assert(decontractid, contractid, "解码后的id不匹配")


            assert(traceid, detraceid, "解码后的数据不匹配")
        });

        it("Ts解码: 对设置好updatetime已编码对象进行解码", async function () {
            let [o, buf] = new cyfs.ContractDecoder().raw_decode(contract3).unwrap()
            let deupdatetime = o.body_expect().update_time()

            let decontractid = o.contract_id()



            assert(decontractid, contractid, "解码后的id不匹配")


            assert(updatetime, deupdatetime, "解码后的数据不匹配")
        });
        it("Ts解码: 对新增好updatetime已编码对象进行解码", async function () {
            let [o, buf] = new cyfs.ContractDecoder().raw_decode(contract4).unwrap()
            let deupdatetime = o.body_expect().update_time()

            let decontractid = o.contract_id()



            assert(decontractid, contractid, "解码后的id不匹配")


            assert(increasetime, deupdatetime, "解码后的数据不匹配")
        });


    });
})  