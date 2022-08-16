import * as cyfs from "../../cyfs_node/cyfs_node"
import * as path from 'path'
import * as fs from 'fs';
import { descpath, decoder, DeleteDescFile } from './index';
var assert = require("assert");


//Action基础对象测试
describe("测试Action对象编解码", async function () {
    // let objectstr = '5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW111';
    // let owner = cyfs.ObjectId.from_base_58(objectstr).unwrap()

    let actionid: cyfs.ActionId
    let uaction: Uint8Array

    //
    let udstr = '5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW111';
    let ud = new Uint8Array().fromHex(udstr).unwrap()
    let dateStamp: number = new Date().getTime()
    let bigint = cyfs.JSBI.BigInt(dateStamp)
    let entrace_id: number = 7086

    let action1: Uint8Array
    let action2: Uint8Array
    let action3: Uint8Array
    let action4: Uint8Array
    let udata: Uint8Array
    let traceid: number | undefined
    let updatetime: cyfs.JSBI
    let increasetime: cyfs.JSBI

    describe("编码", function () {

        it("Ts编码：正常传入有效参数创建action对象", function () {
            let action = cyfs.Action.create()

            actionid = action.action_id()
            uaction = action.to_vec().unwrap()
            console.info(action)
            console.info(actionid)
            console.info(uaction)
        });

        it("Ts编码：创建action对象后设置userdata", function () {
            let action = cyfs.Action.create()

            action.body_expect().set_userdata(ud)

            udata = action.body_expect().user_data().unwrap()
            action1 = action.to_vec().unwrap()
            console.info(udata)
            console.info(action1)
        });

        it("Ts编码：创建action对象后设置trace_id", function () {
            let action = cyfs.Action.create()


            action.body_expect().set_trace_id(entrace_id)
            traceid = action.body_expect().trace_id()
           

            action2 = action.to_vec().unwrap()
            console.info(action)
            console.info(traceid)
            assert(entrace_id, traceid, "断言失败traceid不匹配")
        });
        it("Ts编码：创建action对象后修改update_time", function () {
            let action = cyfs.Action.create()


            action.body_expect().set_update_time(bigint)
            updatetime = action.body_expect().update_time()

            action3 = action.to_vec().unwrap()
            console.info(action)
            console.info(updatetime)
        });
        it("Ts编码：创建action对象后增加update_time", function () {
            let action = cyfs.Action.create()


            action.body_expect().increase_update_time(bigint)
            increasetime = action.body_expect().update_time()

            action4 = action.to_vec().unwrap()
            console.info(action)
            console.info(increasetime)
        });

    });



    describe("解码", async function () {
        it("Ts解码: 对有效已编码对象进行解码", async function () {
            let [o, buf] = new cyfs.ActionDecoder().raw_decode(uaction).unwrap()
            let deactionid = o.action_id




            assert(deactionid, actionid, "解码后的actionid不匹配")
        });
        //
        it("Ts解码: 对设置好userdata已编码对象进行解码", async function () {
            let [o, buf] = new cyfs.ActionDecoder().raw_decode(action1).unwrap()
            let deudata = o.body_expect().user_data().unwrap()




            assert(udata, deudata, "解码后的数据不匹配")
        });
        it("Ts解码: 对设置好trace_id已编码对象进行解码", async function () {
            let [o, buf] = new cyfs.ActionDecoder().raw_decode(action2).unwrap()
            let detraceid = o.body_expect().trace_id()




            assert(traceid, detraceid, "解码后的数据不匹配")
        });

        it("Ts解码: 对设置好updatetime已编码对象进行解码", async function () {
            let [o, buf] = new cyfs.ActionDecoder().raw_decode(action3).unwrap()
            let deupdatetime = o.body_expect().update_time()




            assert(updatetime, deupdatetime, "解码后的数据不匹配")
        });
        it("Ts解码: 对新增好updatetime已编码对象进行解码", async function () {
            let [o, buf] = new cyfs.ActionDecoder().raw_decode(action4).unwrap()
            let deupdatetime = o.body_expect().update_time()




            assert(increasetime, deupdatetime, "解码后的数据不匹配")
        });


    });
})  