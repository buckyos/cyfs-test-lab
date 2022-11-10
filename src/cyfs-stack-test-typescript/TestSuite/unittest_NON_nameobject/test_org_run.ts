import {cyfs} from '../../cyfs_node'
var assert = require("assert");


//Org基础对象测试
describe("测试Org对象编解码", async function () {
    let objectstr = '1234567891112223315456687897854567486764468';
    let orgid = cyfs.ObjectId.from_str(objectstr).unwrap()

    let dateStamp: number = new Date().getTime()
    let datestampstr:string = dateStamp.toString()
    let bigint = cyfs.JSBI.BigInt(dateStamp)

    //
    let udstr = '5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW111';
    let ud = new Uint8Array().fromHex(udstr).unwrap()

    

    let entrace_id: number = 7086

    let corgid: cyfs.ObjectId
    let sorgid: cyfs.ObjectId

    let uorg: Uint8Array
    let sorg: Uint8Array
    let org1: Uint8Array
    let org2: Uint8Array
    let org3: Uint8Array
    let org4: Uint8Array

    let udata: Uint8Array
    let traceid: number | undefined
    let updatetime: cyfs.JSBI
    let increasetime: cyfs.JSBI

   
    
    let member1 = new cyfs.OrgMember(orgid,1,bigint)
    let member2 = new cyfs.OrgMember(orgid,2,bigint)
    let members:cyfs.OrgMember[] = [member1,member2]

    let director1 = new cyfs.Director(orgid,2)
    let director2 = new cyfs.Director(orgid,5)
    let directors:cyfs.Director[] = [director1,director2]



    describe("编码", function () {

        it("Ts编码：正常传入有效参数且total为num创建org对象", function () {
            let org = cyfs.Org.create(
                members,
                directors,
                dateStamp,
                
            )

        
            corgid = org.org_id().object_id
            uorg = org.to_vec().unwrap()
            console.info(org)
            console.info(orgid)
        });

        it("Ts编码：正常传入有效参数且total为string创建org对象", function () {
            let org = cyfs.Org.create(
                members,
                directors,
                datestampstr,
                
            )

        
            sorgid = org.org_id().object_id
            sorg = org.to_vec().unwrap()
            console.info(org)
            console.info(orgid)
        });

        it("Ts编码：创建org对象后设置userdata", function () {
            let org = cyfs.Org.create(
                members,
                directors,
                dateStamp,
                
            )

            org.body_expect().set_userdata(ud)

            udata = org.body_expect().user_data().unwrap()
            org1 = org.to_vec().unwrap()
            console.info(udata)
            console.info(org1)
        });

        it("Ts编码：创建org对象后设置trace_id", function () {
            let org = cyfs.Org.create(
                members,
                directors,
                dateStamp,
                
            )


            org.body_expect().set_trace_id(entrace_id)
            traceid = org.body_expect().trace_id()


            org2 = org.to_vec().unwrap()
            console.info(org2)
            console.info(traceid)
            assert(entrace_id, traceid, "断言失败traceid不匹配")
        });
        it("Ts编码：创建org对象后修改update_time", function () {
            let org = cyfs.Org.create(
                members,
                directors,
                dateStamp,
                
            )


            org.body_expect().set_update_time(bigint)
            updatetime = org.body_expect().update_time()

            org3 = org.to_vec().unwrap()
            console.info(org3)
            console.info(updatetime)
        });
        it("Ts编码：创建org对象后增加update_time", function () {
            let org = cyfs.Org.create(
                members,
                directors,
                dateStamp,
                
            )


            org.body_expect().increase_update_time(bigint)
            increasetime = org.body_expect().update_time()

            org4 = org.to_vec().unwrap()
            console.info(org4)
            console.info(increasetime)
        });
    
    });



    describe("解码", async function () {
        it("Ts解码: 对有效已编码对象total为num进行解码", async function () {
            let [o, buf] = new cyfs.OrgDecoder().raw_decode(uorg).unwrap()
            let deorgid = o.org_id()




            assert(deorgid, corgid, "解码后的id不匹配")
        });

        it("Ts解码: 对有效已编码对象total为string进行解码", async function () {
            let [o, buf] = new cyfs.OrgDecoder().raw_decode(sorg).unwrap()
            let deorgid = o.org_id()




            assert(deorgid, sorgid, "解码后的id不匹配")
        });
        //
        it("Ts解码: 对设置好userdata已编码对象进行解码", async function () {
            let [o, buf] = new cyfs.OrgDecoder().raw_decode(org1).unwrap()
            let deudata = o.body_expect().user_data().unwrap()
            let deorgid = o.org_id()



            assert(deorgid, sorgid, "解码后的id不匹配")

            assert(udata, deudata, "解码后的数据不匹配")

        });
        it("Ts解码: 对设置好trace_id已编码对象进行解码", async function () {
            let [o, buf] = new cyfs.OrgDecoder().raw_decode(org2).unwrap()
            let detraceid = o.body_expect().trace_id()

            let deorgid = o.org_id()



            assert(deorgid, corgid, "解码后的id不匹配")


            assert(traceid, detraceid, "解码后的数据不匹配")
        });

        it("Ts解码: 对设置好updatetime已编码对象进行解码", async function () {
            let [o, buf] = new cyfs.OrgDecoder().raw_decode(org3).unwrap()
            let deupdatetime = o.body_expect().update_time()

            let deorgid = o.org_id()



            assert(deorgid, corgid, "解码后的id不匹配")


            assert(updatetime, deupdatetime, "解码后的数据不匹配")
        });
        it("Ts解码: 对新增好updatetime已编码对象进行解码", async function () {
            let [o, buf] = new cyfs.OrgDecoder().raw_decode(org4).unwrap()
            let deupdatetime = o.body_expect().update_time()

            let deorgid = o.org_id()



            assert(deorgid, corgid, "解码后的id不匹配")


            assert(increasetime, deupdatetime, "解码后的数据不匹配")
        });


    });
})  