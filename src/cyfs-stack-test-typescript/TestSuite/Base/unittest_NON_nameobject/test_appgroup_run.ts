import * as cyfs from '../../../cyfs_node';
import * as path from 'path'
import * as fs from 'fs';
import { descpath, decoder, DeleteDescFile } from './index';
var assert = require("assert");


//AppGroup对象测试
describe("测试Appgroup对象编解码", async function () {
    let udstr = '5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW111';
    let ud = new Uint8Array().fromHex(udstr).unwrap()
    let dateStamp:number = new Date().getTime()
    let bigint =cyfs.JSBI.BigInt(dateStamp) 
    let entrace_id:number = 7086
    let appgroupid: cyfs.AppGroupId
    let appgroupinfo: cyfs.AppGroupBodyContent
    let uappgroup: Uint8Array

    let upappgroup1: Uint8Array
    let upappgroup2: Uint8Array
    let upappgroup3: Uint8Array
    let upappgroup4: Uint8Array
    let udata: Uint8Array|undefined
    let traceid:number|undefined
    let updatetime:cyfs.JSBI
    let increasetime:cyfs.JSBI
 

    describe("编码", function () {

        it("Ts编码：创建Appgroup对象", function () {
            let appgroup = cyfs.AppGroup.create()

            appgroupid = appgroup.appgroup_id()
            appgroupinfo = appgroup.connect_info()
            uappgroup = appgroup.to_vec().unwrap()
            console.info(appgroup)
            console.info(appgroupid)
        });
        it("Ts编码：创建appgroup对象后设置userdata", function () {
            let appgroup = cyfs.AppGroup.create()

            appgroup.body_expect().set_userdata(ud)
          
            udata = appgroup.body_expect().user_data()
            upappgroup1 = appgroup.to_vec().unwrap()
            console.info(udata)
            console.info(upappgroup1)
        });

        it("Ts编码：创建appgroup对象后设置trace_id", function () {
            let appgroup = cyfs.AppGroup.create()

        
            appgroup.body_expect().set_trace_id(entrace_id)
            traceid = appgroup.body_expect().trace_id()


            upappgroup2 = appgroup.to_vec().unwrap()
            console.info(appgroup)
            console.info(traceid)
            assert(entrace_id,traceid,"断言失败traceid不匹配")
        });
        it("Ts编码：创建appgroup对象后设置update_time", function () {
            let appgroup = cyfs.AppGroup.create()

        
            appgroup.body_expect().set_update_time(bigint)
            updatetime = appgroup.body_expect().update_time()

            upappgroup3 = appgroup.to_vec().unwrap()
            console.info(appgroup)
            console.info(updatetime)
        });
        it("Ts编码：创建appgroup对象后增加update_time", function () {
            let appgroup = cyfs.AppGroup.create()

        
            appgroup.body_expect().increase_update_time(bigint)
            increasetime = appgroup.body_expect().update_time()

            upappgroup4 = appgroup.to_vec().unwrap()
            console.info(appgroup)
            console.info(increasetime)
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
        it("Ts解码: 对设置好userdata已编码对象进行解码", async function () {
            let [o, buf] = new cyfs.AppGroupDecoder().raw_decode(upappgroup1).unwrap()
            let deudata = o.body_expect().user_data()
            let deappgroupinfo = o.connect_info()




            assert(udata, deudata, "解码后的udata不匹配")
            assert(deappgroupinfo, appgroupinfo, "解码后的info不匹配")
        });
        it("Ts解码: 对设置好trace_id已编码对象进行解码", async function () {
            let [o, buf] = new cyfs.AppGroupDecoder().raw_decode(upappgroup2).unwrap()
            let detraceid = o.body_expect().trace_id()
            let deappgroupinfo = o.connect_info()




            assert(traceid, detraceid, "解码后的traceid不匹配")
            assert(deappgroupinfo, appgroupinfo, "解码后的info不匹配")
        });

        it("Ts解码: 对设置好updatetime已编码对象进行解码", async function () {
            let [o, buf] = new cyfs.AppGroupDecoder().raw_decode(upappgroup3).unwrap()
            let deupdatetime = o.body_expect().update_time()
            let deappgroupinfo = o.connect_info()




            assert(updatetime, deupdatetime, "解码后的数据不匹配")
            assert(deappgroupinfo, appgroupinfo, "解码后的数据不匹配")
        });
        it("Ts解码: 对新增好updatetime已编码对象进行解码", async function () {
            let [o, buf] = new cyfs.AppGroupDecoder().raw_decode(upappgroup4).unwrap()
            let deupdatetime = o.body_expect().update_time()
            let deappgroupinfo = o.connect_info()




            assert(increasetime, deupdatetime, "解码后的数据不匹配")
            assert(deappgroupinfo, appgroupinfo, "解码后的数据不匹配")
        });
    });
})  