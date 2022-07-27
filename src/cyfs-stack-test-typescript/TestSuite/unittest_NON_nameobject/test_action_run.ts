import * as cyfs from "../../cyfs_node/cyfs_node"
import * as path from 'path'
import * as fs from 'fs';
import { descpath, decoder, DeleteDescFile } from './index';
var assert = require("assert");


//Action对象测试
describe("测试Action对象编解码", async function () {
    // let objectstr = '5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW111';
    // let owner = cyfs.ObjectId.from_base_58(objectstr).unwrap()

    let actionid: cyfs.ActionId
    let uaction: Uint8Array

    describe("编码", function () {

        it("Ts编码：有效传入两个account,service_type参数", function () {
            let action = cyfs.Action.create()

            actionid = action.action_id()
            uaction = action.to_vec().unwrap()
            console.info(action)
            console.info(actionid)
            console.info(uaction)
        });
    

    });



    describe("解码", async function () {
        it("Ts解码: 对有效已编码对象进行解码", async function () {
            let [o, buf] = new cyfs.ActionDecoder().raw_decode(uaction).unwrap()
            let deactionid = o.action_id




            assert(deactionid, actionid, "解码后的actionid不匹配")
        });


    });
})  