import * as cyfs from "../../cyfs_node/cyfs_node"
import * as path from 'path'
import * as fs from 'fs';
import { descpath, decoder, DeleteDescFile } from './index';
var assert = require("assert");


//AppGroup对象测试
describe("测试Appgroup对象编解码", async function () {
    // let objectstr = '5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW111';
    // let owner = cyfs.ObjectId.from_base_58(objectstr).unwrap()

    let appgroupid: cyfs.AppGroupId
    let appgroupinfo: cyfs.AppGroupBodyContent
    let uappgroup: Uint8Array

    describe("编码", function () {

        it("Ts编码：有效传入两个account,service_type参数", function () {
            let appgroup = cyfs.AppGroup.create()

            appgroupid = appgroup.appgroup_id()
            appgroupinfo = appgroup.connect_info()
            uappgroup = appgroup.to_vec().unwrap()
            console.info(appgroup)
            console.info(appgroupid)
        });
    

    });



    describe("解码", async function () {
        it("Ts解码: 对有效已编码对象进行解码", async function () {
            let [o, buf] = new cyfs.AppGroupDecoder().raw_decode(uappgroup).unwrap()
            let deappgroupid = o.appgroup_id()
            let deappgroupinfo = o.connect_info()




            assert(deappgroupid, appgroupid, "解码后的id不匹配")
            assert(deappgroupinfo, appgroupinfo, "解码后的info不匹配")
        });


    });
})  