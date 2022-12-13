import * as cyfs from '../../cyfs_node';
import * as path from 'path'
import * as fs from 'fs';
import { descpath, decoder, DeleteDescFile } from './index';
var assert = require("assert");



//UnionAccount基础对象测试
describe("测试UnionAccount对象编解码", async function () {

    //定义创建对象传入参数
    let account1str = '5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW111';
    let account2str = '1234567891112223315456687897854567486764468';
    let accountstr = '1234567891112223315456687897854567486764468';

    let account1 = cyfs.ObjectId.from_str(account1str).unwrap()
    let account2 = cyfs.ObjectId.from_str(account2str).unwrap()
    let account = cyfs.ObjectId.from_str(accountstr).unwrap()

    let union: Uint8Array
    let unionid: cyfs.UnionAccountId
    let unioninfo: cyfs.UnionAccountBodyContent

    let eunion: Uint8Array
    let eunionid: cyfs.UnionAccountId
    let eunioninfo: cyfs.UnionAccountBodyContent

    let ounion: Uint8Array
    let ounionid: cyfs.UnionAccountId
    let ounioninfo: cyfs.UnionAccountBodyContent


    let udstr = '5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW111';
    let ud = new Uint8Array().fromHex(udstr).unwrap()
    let dateStamp: number = new Date().getTime()
    let bigint = cyfs.JSBI.BigInt(dateStamp)
    let entrace_id: number = 7086

    let unionaccount1: Uint8Array
    let unionaccount2: Uint8Array
    let unionaccount3: Uint8Array
    let unionaccount4: Uint8Array
    let udata: Uint8Array
    let traceid: number | undefined
    let updatetime: cyfs.JSBI
    let increasetime: cyfs.JSBI


    


    describe("编码", function () {


        it("Ts编码：有效传入两个account,service_type参数", function () {
            let unionaccount = cyfs.UnionAccount.create(
                account1,
                account2,
                64,
                undefined
            )
            // let c = unionaccount.desc().content().service_type
            // let l = unionaccount.desc().content().left
            // let r = unionaccount.desc().content().right

            // console.log(c)
            // console.log(l)
            // console.log(r)

            union = unionaccount.to_vec().unwrap()
            unionid = unionaccount.union_account_id()
            unioninfo = unionaccount.connect_info()
        });

        it("Ts编码：传入两个相同的account参数", function () {
            let unionaccount = cyfs.UnionAccount.create(
                account,
                account,
                64,
                undefined
            )


            eunion = unionaccount.to_vec().unwrap()
            eunionid = unionaccount.union_account_id()
            eunioninfo = unionaccount.connect_info()
        });

        it("Ts编码: service_type类型为1", function () {
            let unionaccount = cyfs.UnionAccount.create(
                account1,
                account2,
                1,
                undefined
            )

            ounion = unionaccount.to_vec().unwrap()
            ounionid = unionaccount.union_account_id()
            ounioninfo = unionaccount.connect_info()
        });

        //
        it("Ts编码：创建unionaccount对象后设置userdata", function () {
            let unionaccount = cyfs.UnionAccount.create(
                account1,
                account2,
                64,
                undefined)

            unionaccount.body_expect().set_userdata(ud)

            udata = unionaccount.body_expect().user_data().unwrap()
            unionaccount1 = unionaccount.to_vec().unwrap()
            console.info(udata)
            console.info(unionaccount1)
        });

        it("Ts编码：创建unionaccount对象后设置trace_id", function () {
            let unionaccount = cyfs.UnionAccount.create(
                account1,
                account2,
                64,
                undefined)


            unionaccount.body_expect().set_trace_id(entrace_id)
            traceid = unionaccount.body_expect().trace_id()


            unionaccount2 = unionaccount.to_vec().unwrap()
            console.info(unionaccount2)
            console.info(traceid)
            assert(entrace_id, traceid, "断言失败traceid不匹配")
        });
        it("Ts编码：创建unionaccount对象后设置update_time", function () {
            let unionaccount = cyfs.UnionAccount.create(
                account1,
                account2,
                64,
                undefined)


            unionaccount.body_expect().set_update_time(bigint)
            updatetime = unionaccount.body_expect().update_time()

            unionaccount3 = unionaccount.to_vec().unwrap()
            console.info(unionaccount)
            console.info(updatetime)
        });
        it("Ts编码：创建unionaccount对象后增加update_time", function () {
            let unionaccount = cyfs.UnionAccount.create(
                account1,
                account2,
                64,
                undefined)


            unionaccount.body_expect().increase_update_time(bigint)
            increasetime = unionaccount.body_expect().update_time()

            unionaccount4 = unionaccount.to_vec().unwrap()
            console.info(unionaccount)
            console.info(increasetime)
        });
    });



    describe("解码", async function () {
        it("Ts解码: 对有效已编码对象进行解码", async function () {
            let [o, buf] = new cyfs.UnionAccountDecoder().raw_decode(union).unwrap()
            // let [a, c] = new cyfs.UnionAccountBodyContentDecoder().raw_decode(union).unwrap()
            // let [e, f] = new cyfs.UnionAccountDescContentDecoder().raw_decode(union).unwrap()
            // let [g, h] = new cyfs.UnionAccountIdDecoder().raw_decode(union).unwrap()
            // let [i, k] = new cyfs.UnionAccountDescDecoder().raw_decode(union).unwrap()



            let deunionid = o.union_account_id()
            let deunioninfo = o.connect_info()
            let detype = o.desc().content().service_type
            let deaccount1 = o.desc().content().left
            let deaccount2 = o.desc().content().right
            assert(deunionid, unionid, "解码后的id不匹配")
            assert(deunioninfo, unioninfo, "解码后的info不匹配")
            assert(detype, 64, "解码后的info不匹配")
            assert(deaccount1, account1, "解码后的info不匹配")
            assert(deaccount2, account2, "解码后的info不匹配")
        });

        it("Ts解码: 对相同account已编码对象进行解码", async function () {
            let [o, buf] = new cyfs.UnionAccountDecoder().raw_decode(eunion).unwrap()

            let deunionid = o.union_account_id()
            let deunioninfo = o.connect_info()
            let detype = o.desc().content().service_type
            let deaccount1 = o.desc().content().left
            let deaccount2 = o.desc().content().right
            assert(deunionid, eunionid, "解码后的id不匹配")
            assert(deunioninfo, eunioninfo, "解码后的info不匹配")
            assert(detype, 64, "解码后的info不匹配")
            assert(deaccount1, account, "解码后的info不匹配")
            assert(deaccount2, account2, "解码后的info不匹配")
        })

        it("Ts解码: 对service_type为1已编码对象进行解码", async function () {
            let [o, buf] = new cyfs.UnionAccountDecoder().raw_decode(ounion).unwrap()

            let deunionid = o.union_account_id()
            let deunioninfo = o.connect_info()
            let detype = o.desc().content().service_type
            console.log(detype)
            let deaccount1 = o.desc().content().left
            let deaccount2 = o.desc().content().right
            assert(deunionid, ounionid, "解码后的id不匹配")
            assert(deunioninfo, ounioninfo, "解码后的info不匹配")
            assert(detype, 1, "解码后的info不匹配")
            assert(deaccount1, account1, "解码后的数据不匹配")
            assert(deaccount2, account2, "解码后的数据不匹配")
        })

        //
        it("Ts解码: 对设置好userdata已编码对象进行解码", async function () {
            let [o, buf] = new cyfs.UnionAccountDecoder().raw_decode(unionaccount1).unwrap()
            let deudata = o.body_expect().user_data().unwrap()




            assert(udata, deudata, "解码后的数据不匹配")
        });
        it("Ts解码: 对设置好trace_id已编码对象进行解码", async function () {
            let [o, buf] = new cyfs.UnionAccountDecoder().raw_decode(unionaccount2).unwrap()
            let detraceid = o.body_expect().trace_id()




            assert(traceid, detraceid, "解码后的数据不匹配")
        });

        it("Ts解码: 对设置好updatetime已编码对象进行解码", async function () {
            let [o, buf] = new cyfs.UnionAccountDecoder().raw_decode(unionaccount3).unwrap()
            let deupdatetime = o.body_expect().update_time()




            assert(updatetime, deupdatetime, "解码后的数据不匹配")
        });
        it("Ts解码: 对新增好updatetime已编码对象进行解码", async function () {
            let [o, buf] = new cyfs.UnionAccountDecoder().raw_decode(unionaccount4).unwrap()
            let deupdatetime = o.body_expect().update_time()




            assert(increasetime, deupdatetime, "解码后的数据不匹配")
        });

    });
})  
