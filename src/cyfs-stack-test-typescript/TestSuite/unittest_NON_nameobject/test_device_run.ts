import * as cyfs from "../../cyfs_node/cyfs_node"
import * as path from 'path'
import * as fs from 'fs';
import { descpath, run, decoder, DeleteDescFile } from './index';
var assert = require("assert");


//Device对象测试
describe("测试Device对象编解码", function () {

    //定义创建对象传入参数
    let objectidstr = '5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW7oC';
    let deviceidstr1 = '5aUiNsqh5oSZnwaEb8wj7rwSouqGNuEgjF3pLB1y4pGQ';
    let deviceidstr2 = '5aUiNsqWyZFmJNndx5dTDaTASNJPmj8k8npCdq9z9D16'
    let endpointstr = 'L6udp[512:2067:4658:4686:1217:512:768:255]:20993'
    let endpointstr2 = 'L6tcp[512:ffff:4658:4686:ffff:512:768:255]:20993'
    let name = '!@#$%^&*QWERTYUIASDFGHJK'

    let owner = cyfs.ObjectId.from_base_58(objectidstr).unwrap();
    let area = new cyfs.Area(1, 2, 3, 4);
    let public_key = cyfs.PrivateKey.generate_rsa(2048).unwrap().public();
    let unique_id = cyfs.UniqueId.default();
    let category = cyfs.DeviceCategory.OOD;
    let endpoint = cyfs.Endpoint.fromString(endpointstr).unwrap();
    let deviceid2 = cyfs.DeviceId.from_base_58(deviceidstr2).unwrap()
    let deviceid1 = cyfs.DeviceId.from_base_58(deviceidstr1).unwrap()
    let sn_list = [deviceid1]
    let passive_sn_list = [deviceid2]


    //定义文件路径
    let filepath = descpath('Device1');
    let filepath1 = descpath('Device2');
    let filepath3 = descpath('Device3');
    let filepath4 = descpath('Device4');
    let filepath5 = descpath('Device5');
    let filepath6 = descpath('Device6');


    //定义endpoints,sn_list,passive_sn_list多个值传参
    let endpoint2 = cyfs.Endpoint.fromString(endpointstr2).unwrap();
    let endpoints = [endpoint, endpoint2]
    let sn_lists = [deviceid1, deviceid1, deviceid1, deviceid2]
    let passive_sn_lists = [deviceid2, deviceid2, deviceid2, deviceid1]

    //定义endpoints,sn_list,passive_sn_list空值传参
    let endpoint_e: cyfs.Endpoint[] = [];
    let sn_list_e: cyfs.DeviceId[] = [];
    let passive_sn_list_e: cyfs.DeviceId[] = [];
    let name_e = ''

    describe("编码", function () {
        it("Ts编码：有效传入owner,unique_id,endpoints,sn_list,passive_sn_list,public_key,area,category参数", async function () {
            let Device = cyfs.Device.create(
                cyfs.Some(owner),
                unique_id,
                [endpoint],
                sn_list,
                passive_sn_list,
                public_key,
                area,
                category
            )
            fs.writeFileSync(filepath, Device.to_vec().unwrap());
        });
        it("Ts编码：有效传入多值组成的endpoints,sn_list,passive_sn_list参数", async function () {
            let Device = cyfs.Device.create(
                cyfs.Some(owner),
                unique_id,
                endpoints,
                sn_lists,
                passive_sn_lists,
                public_key,
                area,
                category
            )
            fs.writeFileSync(filepath3, Device.to_vec().unwrap());
        });
        it("Ts编码：有效传入空值组成的endpoints,sn_list,passive_sn_list参数", async function () {
            let Device = cyfs.Device.create(
                cyfs.None,
                unique_id,
                endpoint_e,
                sn_list_e,
                passive_sn_list_e,
                public_key,
                area,
                category
            )
            fs.writeFileSync(filepath4, Device.to_vec().unwrap());
        });
        it("Ts编码：有效调用set_name()方法，修改name属性", async function () {
            let Device = cyfs.Device.create(
                cyfs.None,
                unique_id,
                endpoint_e,
                sn_list_e,
                passive_sn_list_e,
                public_key,
                area,
                category
            )
            Device.set_name(name)
            fs.writeFileSync(filepath5, Device.to_vec().unwrap());
            assert.equal(name, Device.name())
        });
        it("Ts编码：有效调用set_name()方法，传入name空值属性", async function () {
            let Device = cyfs.Device.create(
                cyfs.None,
                unique_id,
                endpoint_e,
                sn_list_e,
                passive_sn_list_e,
                public_key,
                area,
                category
            )
            Device.set_name(name_e)
            fs.writeFileSync(filepath6, Device.to_vec().unwrap());
            assert.equal(name_e, Device.name())
        });
    });

    describe("解码", function () {
        //Ts编码生成对象
        let Device = cyfs.Device.create(
            cyfs.Some(owner),
            unique_id,
            [endpoint],
            sn_list,
            passive_sn_list,
            public_key,
            area,
            category
        )
        let DeviceId = Device.desc().calculate_id()
        fs.writeFileSync(filepath1, Device.to_vec().unwrap());

        it("Ts解码(Ts编码对象)：有效对Ts编码对象进行Ts解码", async function () {
            //对象解码
            let desc_buffer = decoder(filepath1)
            let [target, buffer] = new cyfs.DeviceDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let owner_deco = target.desc().owner()?.unwrap()
            let DeviceId_deco = target.desc().calculate_id()
            let snlist_deco = target.body_expect().content().sn_list()[0];
            let passive_pn_list_deco = target.body_expect().content().passive_pn_list()[0];
            let catelogy_deco = target.category().unwrap()
            let endpoint_deco = target.body_expect().content().endpoints()[0]
            let uniqueid = target.desc().content().unique_id().to_base_58()

            //属性校验
            assert(owner_deco?.equals(owner), 'owner属性不相等');
            assert(DeviceId_deco?.equals(DeviceId), 'DeviceId属性不相等');
            assert(snlist_deco?.equals(deviceid1), 'snlist属性不相等');
            assert(passive_pn_list_deco?.equals(deviceid2), 'passive_pn_list属性不相等');
            assert.equal(endpointstr, endpoint_deco.toString());
            assert.equal(category.toString(), catelogy_deco.toString());
            assert.equal(unique_id.to_base_58(), uniqueid);
        });
        it("Ts解码(Ts编码对象)：有效对endpoints,sn_list,passive_sn_list参数传多值的对象进行Ts解码", async function () {
            //对象解码
            let desc_buffer = decoder(filepath3)
            let [target, buffer] = new cyfs.DeviceDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let snlist_deco = target.body_expect().content().sn_list();
            let passive_pn_list_deco = target.body_expect().content().passive_pn_list();
            let endpoint_deco = target.body_expect().content().endpoints();

            //属性校验
            for (let i in snlist_deco) {
                assert(snlist_deco[i].equals(sn_lists[i]), 'snlist属性不相等');
            }
            for (let i in passive_pn_list_deco) {
                assert(passive_pn_list_deco[i].equals(passive_sn_lists[i]), 'passive_pn_list属性不相等');
            }
            for (let i in endpoint_deco) {
                assert.equal(endpoints[i].toString(), endpoint_deco[i].toString());
            }
        });
        it("Ts解码(Ts编码对象)：有效对endpoints,sn_list,passive_sn_list参数传空值的对象进行Ts解码", async function () {
            //对象解码
            let desc_buffer = decoder(filepath4)
            let [target, buffer] = new cyfs.DeviceDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let owner_deco: any = target.desc().owner()?.unwrap().to_base_58();
            let snlist_deco = target.body_expect().content().sn_list();
            let passive_pn_list_deco = target.body_expect().content().passive_pn_list();
            let endpoint_deco = target.body_expect().content().endpoints();

            //属性校验
            assert.equal(undefined, owner_deco);
            assert.equal(0, endpoint_deco.length);
            assert.equal(0, snlist_deco.length);
            assert.equal(0, passive_pn_list_deco.length);
        });
        it("Ts解码(Ts编码对象)：有效对修改过name属性的对象进行Ts解码", async function () {
            //对象解码
            let desc_buffer = decoder(filepath5)
            let [target, buffer] = new cyfs.DeviceDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let name_deco = target.name()

            //属性校验
            assert.equal(name, name_deco);
        });
        it("Ts解码(Ts编码对象)：有效对传入空值的name进行Ts解码", async function () {
            //对象解码
            let desc_buffer = decoder(filepath6)
            let [target, buffer] = new cyfs.DeviceDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let name_deco = target.name()

            //属性校验
            assert.equal("", name_deco);
        });

        it("Rust工具解码(Ts编码对象)：有效对Ts编码对象进行Rust工具解码", async function () {
            let ffsClientPath = __dirname + '/test-tool/tool/desc-tool.exe';
            let args = ' show -a ' + filepath1;
            let runInfo = await run(ffsClientPath, args, false, (data: string) => {
                let arr1 = data.split(/: |\n/);
                for (let i in arr1) {
                    let value = arr1[i];
                    let index: any = Number(i) + 1;
                    //校验DeviceId属性
                    if (value == 'objectid') {
                        let objectid_rust = arr1[index]
                        assert.equal(DeviceId.to_base_58(), objectid_rust)
                    };
                    //校验owner属性
                    if (value == 'owner') {
                        let owner_rust = arr1[index]
                        assert.equal(objectidstr, owner_rust)
                    }
                    //校验endpoint属性
                    if (value == 'endpoint') {
                        let endpoints_rust = arr1[index]
                        let endpoint_rust = endpoints_rust.slice(1, endpoints_rust.length - 3)
                        assert.equal(endpointstr, endpoint_rust)
                    }
                    //校验snlist属性
                    if (value == 'snlist') {
                        let sn_list_rust = arr1[index]
                        let sn_dervice_rust = sn_list_rust.slice(1, sn_list_rust.length - 3)
                        assert.equal(deviceidstr1, sn_dervice_rust)
                    }
                    // //校验uniqueid属性
                    // //显示格式不同，ts是base58格式，desc-tool是hex格式，不是缺陷
                    // if (value == 'uniqueid') {
                    //     let uniqueid_rust = arr1[index]
                    //     assert.equal(unique_id.to_base_58(), uniqueid_rust)
                    // }
                    //校验device catelogy属性
                    if (value == 'device catelogy') {
                        let catelogy_rust = arr1[index]
                        assert.equal(cyfs.DeviceCategory[category], catelogy_rust)
                    }
                }
            });
        });
        it("Rust工具编码->Ts解码：有效进行Rust工具编码对象，再进行Ts解码流程", async function () {
            //rust创建对象
            //创建cmd命令： create device --area 1:2:3:4 --category ood --deviceid  "1234567890" --eps "L6udp[512:2067:4658:4686:1217:512:768:255]:20993" --pktype rsa1024 --snlist  "5aUiNsqh5oSZnwaEb8wj7rwSouqGNuEgjF3pLB1y4pGQ" --owner "5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW7oC"
            let ffsClientPath = __dirname + '/test-tool/tool/desc-tool.exe';
            let args1 = ' create device --area 1:2:3:4 --category ood --deviceid  "1234567890" --eps "L6udp[512:2067:4658:4686:1217:512:768:255]:20993" --pktype rsa1024 --snlist  "5aUiNsqh5oSZnwaEb8wj7rwSouqGNuEgjF3pLB1y4pGQ" --owner "5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW7oC"';
            var rust_desc = ''
            let runInfo1 = await run(ffsClientPath, args1, false, (data: string) => {
                rust_desc = data.slice(data.length - 50, data.length - 6)
            })

            //Ts解码(Ts编码对象)对象,获取属性
            let rustfilepath = __dirname + '/test-tool/tool/' + rust_desc + '.desc'
            let rustfilesecpath = __dirname + '/test-tool/tool/' + rust_desc + '.sec'
            let desc_buffer = decoder(rustfilepath)
            let [target, buffer] = new cyfs.DeviceDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let owner_ts: any = target.desc().owner()?.unwrap().to_base_58();
            let DeviceId_ts: string = target.desc().calculate_id().to_base_58()
            let snlist_ts = target.body_expect().content().sn_list()[0];
            let catelogy_ts = target.category().unwrap()
            let endpoint_ts = target.body_expect().content().endpoints()[0]


            // rust解码对象，校验属性值
            let args2 = ' show -a ' + rustfilepath;
            let runInfo2 = await run(ffsClientPath, args2, false, (data: string) => {
                let arr1 = data.split(/: |\n/);
                for (let i in arr1) {
                    let value = arr1[i];
                    let index: any = Number(i) + 1;
                    //校验DeviceId属性
                    if (value == 'objectid') {
                        let objectid_rust = arr1[index]
                        assert.equal(DeviceId_ts, objectid_rust)
                    };
                    //校验owner属性
                    if (value == 'owner') {
                        let owner_rust = arr1[index]
                        assert.equal(owner_ts, owner_rust)
                    }
                    //校验endpoint属性
                    if (value == 'endpoint') {
                        let endpoints_rust = arr1[index]
                        let endpoint_rust = endpoints_rust.slice(1, endpoints_rust.length - 3)
                        assert.equal(endpoint_ts, endpoint_rust)
                    }
                    //校验snlist属性
                    if (value == 'snlist') {
                        let sn_list_rust = arr1[index]
                        let sn_dervice_rust = sn_list_rust.slice(1, sn_list_rust.length - 3)
                        assert.equal(snlist_ts.to_base_58(), sn_dervice_rust)
                    }
                    //校验device catelogy属性
                    if (value == 'device catelogy') {
                        let catelogy_rust = arr1[index]
                        assert.equal(cyfs.DeviceCategory[catelogy_ts], catelogy_rust)

                        //验证所有属性测试通过，执行删除测试desc文件命令
                        DeleteDescFile(rustfilepath);
                        DeleteDescFile(rustfilesecpath);
                    }
                }
            });
        });
    });
})