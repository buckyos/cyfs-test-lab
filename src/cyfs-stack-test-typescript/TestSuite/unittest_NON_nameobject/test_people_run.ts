import * as cyfs from "../../cyfs_node/cyfs_node"
import * as path from 'path'
import * as fs from 'fs';
import { descpath, run, decoder, DeleteDescFile } from './index';
import { copySync } from "fs-extra";
var assert = require("assert");


//People对象测试
describe("测试People对象编解码", function () {

    //定义创建对象传入参数
    let objectidstr = '5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW7oC';
    let deviceidstr = '5aUiNsqh5oSZnwaEb8wj7rwSouqGNuEgjF3pLB1y4pGQ';
    let deviceidstr2 = '5aUiNsqWyZFmJNndx5dTDaTASNJPmj8k8npCdq9z9D16';
    let fileidstr = '7Tk94YfZjQQETp7wnMZPg9CiqZWNDwSTAxnXfCAG62Vu';
    let name = "TEST123456!@#$%^";
    let name_e = "";
    let name2 = "修改name！@#￥%……&*（";

    let owner = cyfs.ObjectId.from_base_58(objectidstr).unwrap();
    let deviceid = cyfs.DeviceId.from_base_58(deviceidstr).unwrap();
    let ood_list1 = [deviceid]
    let area = new cyfs.Area(1, 2, 3, 4);
    let fileid = cyfs.FileId.from_base_58(fileidstr).unwrap()
    let secret = cyfs.PrivateKey.generate_rsa(2048).unwrap();
    let icon = fileid

    //变量定义：ood_list参数传入多个DeviceId
    let deviceid2 = cyfs.DeviceId.from_base_58(deviceidstr2).unwrap();
    let ood_list = [deviceid, deviceid, deviceid, deviceid, deviceid2, deviceid2]
    let deviceid3: cyfs.DeviceId[] = [];

    //变量定义：set_icon的调用
    let fileidstr1 = '7Tk94Yfh3i5r5fFtvPMZqreFA9tcYfrhMext8dVDU5Zi'
    let fileid1 = cyfs.FileId.from_base_58(fileidstr1).unwrap()

    //定义文件路径：
    let filepath = descpath('People');
    let filepath1 = descpath('People01');
    let filepath2 = descpath('People02');
    let filepath3 = descpath('People03');
    let filepath4 = descpath('People04');
    let filepath5 = descpath('People05');
    let filepath6 = descpath('People06');

    describe("编码", function () {
        it("Ts编码：有效传入owner,ood_list,public,area,name,icon参数", async function () {
            let People = cyfs.People.create(
                cyfs.Some(owner),
                ood_list1,
                secret.public(),
                cyfs.Some(area),
                name,
                icon,
            )
            fs.writeFileSync(filepath, People.to_vec().unwrap());
        });
        it("Ts编码：有效传入多个DeviceId组成的ood_list参数", async function () {
            let People = cyfs.People.create(
                cyfs.Some(owner),
                ood_list,
                secret.public(),
                cyfs.Some(area),
                name,
                icon,
            )
            fs.writeFileSync(filepath2, People.to_vec().unwrap());
        });
        it("Ts编码：有效传入空值的ood_list参数", async function () {
            let People = cyfs.People.create(
                cyfs.Some(owner),
                deviceid3,
                secret.public(),
                cyfs.Some(area),
                name,
                icon,
            )
            fs.writeFileSync(filepath3, People.to_vec().unwrap());
        });
        it("Ts编码：有效传入空值的owner,name参数", async function () {
            let People = cyfs.People.create(
                cyfs.None,
                ood_list1,
                secret.public(),
                cyfs.None,
                name_e,
                icon,
            )
            fs.writeFileSync(filepath4, People.to_vec().unwrap());
        });
        it("Ts编码：有效不传入name,icon参数", async function () {
            let People = cyfs.People.create(
                cyfs.Some(owner),
                ood_list1,
                secret.public(),
                cyfs.Some(area),
            )
            fs.writeFileSync(filepath, People.to_vec().unwrap());
        });
        it("Ts编码：有效调用set_name()方法，修改name属性", async function () {
            let People = cyfs.People.create(
                cyfs.Some(owner),
                ood_list1,
                secret.public(),
                cyfs.Some(area),
                name,
                icon,
            )
            People.set_name(name2)
            fs.writeFileSync(filepath5, People.to_vec().unwrap());
            assert.equal(name2, People.name());
        });
        it("Ts编码：有效调用set_icon()方法，修改icon属性", async function () {
            let People = cyfs.People.create(
                cyfs.Some(owner),
                ood_list1,
                secret.public(),
                cyfs.Some(area),
                name,
                icon,
            )
            People.set_icon(fileid1)
            fs.writeFileSync(filepath6, People.to_vec().unwrap());
            assert(People.icon()?.equals(fileid1), 'icon 属性不相等');
        });
    });

    describe("解码", function () {
        //Ts编码生成对象
        let People = cyfs.People.create(
            cyfs.Some(owner),
            ood_list1,
            secret.public(),
            cyfs.Some(area),
            name,
            icon,
        )
        let PeopleId = People.desc().calculate_id();
        fs.writeFileSync(filepath1, People.to_vec().unwrap());

        it("Ts解码(Ts编码对象)：有效对Ts编码对象进行Ts解码", async function () {
            //对象解码
            let desc_buffer = decoder(filepath1)
            let [target, buffer] = new cyfs.PeopleDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let owner_deco = target.desc().owner()?.unwrap();
            let PeopleId_deco = target.desc().calculate_id();
            let icon_deco = target.icon()
            let name_deco = target.name();
            let ood_list_deco = target.body_expect().content().ood_list

            //属性校验
            assert(owner_deco?.equals(owner), 'owner属性不相等');
            assert(PeopleId_deco.equals(PeopleId), 'PeopleId属性不相等');
            assert(icon_deco?.equals(icon), 'icon属性不相等');
            assert.equal(name, name_deco);
            for (let i in ood_list_deco) {
                assert(ood_list_deco[i].equals(ood_list1[i]), 'ood_list属性不相等')
            }

        });
        it("Ts解码(Ts编码对象)：有效对ood_list参数传多值的对象进行Ts解码", async function () {
            //对象解码
            let desc_buffer = decoder(filepath2)
            let [target, buffer] = new cyfs.PeopleDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let ood_list_deco = target.body_expect().content().ood_list

            //属性校验
            for (let i in ood_list_deco) {
                assert(ood_list_deco[i].equals(ood_list[i]), 'ood_list属性不相等')
            }
        });
        it("Ts解码(Ts编码对象)：有效对owner,name参数传空值的对象进行Ts解码", async function () {
            //对象解码
            let desc_buffer = decoder(filepath4)
            let [target, buffer] = new cyfs.PeopleDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let owner_deco: any = target.desc().owner()?.unwrap().to_base_58();

            //属性校验
            assert.equal(undefined, owner_deco);
            assert.equal("", target.name());
        });
        it("Ts解码(Ts编码对象)：有效对修改过name属性的对象进行Ts解码", async function () {
            //对象解码
            let desc_buffer = decoder(filepath5)
            let [target, buffer] = new cyfs.PeopleDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let name_deco = target.name();

            //属性校验
            assert.equal(name2, name_deco);
        });
        it("Ts解码(Ts编码对象)：有效对修改过icon属性的对象进行Ts解码", async function () {
            //对象解码
            let desc_buffer = decoder(filepath6)
            let [target, buffer] = new cyfs.PeopleDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let icon_deco = target.icon();

            //属性校验
            assert(icon_deco?.equals(fileid1), 'icon属性不相等');
        });

        it("Rust工具解码(Ts编码对象)：有效对Ts编码对象进行Rust工具解码", async function () {
            let ffsClientPath = __dirname + '/test-tool/tool/desc-tool.exe';
            let args = ' show -a ' + filepath1;
            let runInfo = await run(ffsClientPath, args, false, (data: string) => {
                let arr1 = data.split(/: |\n/);
                for (let i in arr1) {
                    let value = arr1[i];
                    let index: any = Number(i) + 1;
                    //校验PeopleId属性
                    if (value == 'objectid') {
                        let objectid_rust = arr1[index]
                        assert.equal(PeopleId.to_base_58(), objectid_rust)
                    };
                    //校验owner属性
                    if (value == 'owner') {
                        let owner_rust = arr1[index]
                        assert.equal(objectidstr, owner_rust)
                    }
                    //校验ood_list属性
                    if (value == 'ood_list') {
                        let ood_list_rust = arr1[index]
                        let ood_rust = ood_list_rust.slice(1, ood_list_rust.length - 3)
                        assert.equal(deviceidstr, ood_rust)
                    }
                    //校验name属性
                    if (value == 'name') {
                        let name_rust = arr1[index]
                        assert.equal(name, name_rust)
                    }
                    //校验icon属性
                    if (value == 'icon') {
                        let icon_rust = arr1[index]
                        assert.equal(fileidstr, icon_rust)
                    }
                }
            });
        });

        it("Rust工具编码->Ts解码：有效进行Rust工具编码对象，再进行Ts解码流程", async function () {
            //rust创建对象
            //创建cmd命令：desc-tool.exe create people --area 1:2:3:4 --pktype rsa1024 --owner "5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW7oC"  --oodlist "5aUiNsqh5oSZnwaEb8wj7rwSouqGNuEgjF3pLB1y4pGQ"
            let ffsClientPath = __dirname + '/test-tool/tool/desc-tool.exe';
            let args1 = ' create people --area 1:2:3:4 --pktype rsa1024 --owner "5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW7oC"  --oodlist "5aUiNsqh5oSZnwaEb8wj7rwSouqGNuEgjF3pLB1y4pGQ" ';
            var rust_desc = ''
            let runInfo1 = await run(ffsClientPath, args1, false, (data: string) => {
                rust_desc = data.slice(data.length - 50, data.length - 6)
            })

            //Ts解码(Ts编码对象)对象,获取属性
            let rustfilepath = __dirname + '/test-tool/tool/' + rust_desc + '.desc'
            let rustfilesecpath = __dirname + '/test-tool/tool/' + rust_desc + '.sec'
            let desc_buffer = decoder(rustfilepath)
            let [target, buffer] = new cyfs.PeopleDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let owner_deco: any = target.desc().owner()?.unwrap().to_base_58();
            let PeopleId_deco: string = target.desc().calculate_id().to_base_58()
            let [ood_list_deco] = target.body_expect().content().ood_list.values()

            //rust解码对象，校验属性值
            let args2 = ' show -a ' + rustfilepath;
            let runInfo2 = await run(ffsClientPath, args2, false, (data: string) => {
                let arr1 = data.split(/: |\n/);
                for (let i in arr1) {
                    let value = arr1[i];
                    let index: any = Number(i) + 1;
                    //校验PeopleId属性
                    if (value == 'objectid') {
                        let objectid_rust = arr1[index]
                        assert.equal(PeopleId_deco, objectid_rust)
                    };
                    //校验owner属性
                    if (value == 'owner') {
                        let owner_rust = arr1[index]
                        assert.equal(owner_deco, owner_rust)
                    }
                    //校验ood_list属性
                    if (value == 'ood_list') {
                        let ood_list_rust = arr1[index]
                        let ood_rust = ood_list_rust.slice(1, ood_list_rust.length - 3)
                        assert.equal(ood_list_deco.to_base_58(), ood_rust)

                        //验证所有属性测试通过，执行删除测试desc文件命令
                        DeleteDescFile(rustfilepath);
                        DeleteDescFile(rustfilesecpath);
                    }
                }
            })
        });
    });
})