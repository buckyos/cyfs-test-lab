import * as cyfs from '../../../cyfs_node';
import * as path from 'path'
import * as fs from 'fs-extra';
import { descpath, run, decoder, DeleteDescFile } from './index';
import { copySync } from "fs-extra";
var assert = require("assert");
import { ErrorCode, RandomGenerator } from "../../../common";


//People对象测试
describe("测试People对象编解码", function () {

    //定义创建对象传入参数
    let objectidstr = '5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW7oC';
    let deviceidstr = '5aUiNsqh5oSZnwaEb8wj7rwSouqGNuEgjF3pLB1y4pGQ';
    let deviceidstr2 = '5aUiNsqWyZFmJNndx5dTDaTASNJPmj8k8npCdq9z9D16';
    let fileidstr = '7Tk94YfZjQQETp7wnMZPg9CiqZWNDwSTAxnXfCAG62Vu';
    let name = "TEST123456!@#$%^";

    let owner = cyfs.ObjectId.from_base_58(objectidstr).unwrap();
    let deviceid = cyfs.DeviceId.from_base_58(deviceidstr).unwrap();
    let ood_list1 = [deviceid]
    let area = new cyfs.Area(245, 2, 5, 10);
    let fileid = cyfs.FileId.from_base_58(fileidstr).unwrap()
    let secret = cyfs.PrivateKey.generate_rsa(2048).unwrap();
    let icon = fileid



    //变量定义：set_icon的调用
    let fileidstr1 = '7Tk94Yfh3i5r5fFtvPMZqreFA9tcYfrhMext8dVDU5Zi'
    let fileid1 = cyfs.FileId.from_base_58(fileidstr1).unwrap()

    let PeopleId: cyfs.ObjectId
    //定义文件路径：
    let filepath = descpath('People');
    let filepath1 = descpath('People01');
    let filepath2 = descpath('People02');
    let filepath3 = descpath('People03');
    let filepath4 = descpath('People04');
    let filepath5 = descpath('People05');
    let filepath6 = descpath('People06');
    let filepath7 = descpath('People07');
    let filepath8 = descpath('People08');
    let filepath9 = descpath('People09');
    let filepath10 = descpath('People10');
    let filepath11 = descpath('People11');
    let filepath12 = descpath('People12');
    let filepath13 = descpath('People13');

    cyfs.clog.enable_file_log({
        name: "test_main",
        dir: cyfs.get_app_log_dir("test_namedobject"),
        file_max_size: 1024 * 1024 * 10,
        file_max_count: 10,
    });

    describe("Ts编解码", function () {
        it("Ts编码：有效传入owner,ood_list,public,area,name,icon参数", async function () {
            let People = cyfs.People.create(
                owner,
                ood_list1,
                secret.public(),
                area,
                name,
                icon,
            )
            let u8people = People.to_vec().unwrap()
            fs.writeFileSync(filepath, u8people);
            PeopleId = People.desc().calculate_id();

            let [target, buffer] = new cyfs.PeopleDecoder().raw_decode(u8people).unwrap();

            //获取属性
            let owner_deco = target.desc().owner();
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

        it("Ts编码：有效传入多个DeviceId组成的ood_list参数", async function () {
            let deviceid2 = cyfs.DeviceId.from_base_58(deviceidstr2).unwrap();
            let ood_list = [deviceid, deviceid, deviceid, deviceid, deviceid2, deviceid2]

            let People = cyfs.People.create(
                owner,
                ood_list,
                secret.public(),
                area,
                name,
                icon,
            )
            let u8people = People.to_vec().unwrap()
            fs.writeFileSync(filepath1, People.to_vec().unwrap());


            PeopleId = People.desc().calculate_id();

            let [target] = new cyfs.PeopleDecoder().raw_decode(u8people).unwrap();

            //获取属性
            let owner_deco = target.desc().owner();
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
                assert(ood_list_deco[i].equals(ood_list[i]), 'ood_list属性不相等')
            }



        });
        it("Ts编码：有效传入空值的ood_list参数", async function () {
            let deviceid3: cyfs.DeviceId[] = [];

            let People = cyfs.People.create(
                owner,
                deviceid3,
                secret.public(),
                area,
                name,
                icon,
            )
            let u8people = People.to_vec().unwrap()
            let enood_list = People.body_expect().content().ood_list
            fs.writeFileSync(filepath2, u8people);
            let [target, buffer] = new cyfs.PeopleDecoder().raw_decode(u8people).unwrap();

            //获取属性
            let deood_list = target.body_expect().content().ood_list
            //属性校验

            console.log("en----------" + typeof (enood_list))
            console.log("de----------" + typeof (deood_list))
            assert.equal(deood_list, "", 'ood_list属性不相等')


        });
        it("Ts编码：有效传入空值的owner,name参数", async function () {
            let People = cyfs.People.create(
                undefined,
                ood_list1,
                secret.public(),
                area,
                "",
                icon,
            )
            let u8people = People.to_vec().unwrap()
            fs.writeFileSync(filepath3, u8people);
            let [target, buffer] = new cyfs.PeopleDecoder().raw_decode(u8people).unwrap();

            //获取属性
            let owner_deco: any = target.desc().owner()?.to_base_58();

            //属性校验
            assert.equal(undefined, owner_deco);
            assert.equal("", target.name());
        });
        it("Ts编码：有效不传入name,icon参数", async function () {
            let People = cyfs.People.create(
                owner,
                ood_list1,
                secret.public(),
                area,
            )
            let u8people = People.to_vec().unwrap()
            fs.writeFileSync(filepath4, u8people);
            let [target, buffer] = new cyfs.PeopleDecoder().raw_decode(u8people).unwrap();

            //属性校验
            assert.equal(undefined, target.icon());
            assert.equal(undefined, target.name());
        });
        it("Ts编码：有效调用set_name()方法，修改name属性", async function () {
            let People = cyfs.People.create(
                owner,
                ood_list1,
                secret.public(),
                area,
                name,
                icon,
            )
            let name2 = "修改name！@#￥%……&*（"
            People.set_name(name2)
            let u8people = People.to_vec().unwrap()
            fs.writeFileSync(filepath5, u8people);
            assert.equal(name2, People.name());
            let [target, buffer] = new cyfs.PeopleDecoder().raw_decode(u8people).unwrap();

            //获取属性
            let name_deco = target.name();

            //属性校验
            assert.equal(name2, name_deco);
        });
        it("Ts编码：有效调用set_icon()方法，修改icon属性", async function () {
            let People = cyfs.People.create(
                owner,
                ood_list1,
                secret.public(),
                area,
                name,
                icon,
            )
            People.set_icon(fileid1)
            let u8people = People.to_vec().unwrap()
            fs.writeFileSync(filepath6, u8people);
            assert(People.icon()?.equals(fileid1), 'icon 属性不相等');
            let [target, buffer] = new cyfs.PeopleDecoder().raw_decode(u8people).unwrap();

            //获取属性
            let icon_deco = target.icon();

            //属性校验
            assert(icon_deco?.equals(fileid1), 'icon属性不相等');

        });
        it("Ts编码：设置name,icon参数为undefined", async function () {
            let People = cyfs.People.create(
                owner,
                ood_list1,
                secret.public(),
                area,
                undefined,
                undefined,
            )
            let u8people = People.to_vec().unwrap()
            fs.writeFileSync(filepath7, u8people);
            let [target, buffer] = new cyfs.PeopleDecoder().raw_decode(u8people).unwrap();
            //属性校验
            assert.equal(undefined, target.icon());
            assert.equal(undefined, target.name());
        });
        it("Ts编码：设置name大于64MB", async function (done) {
            this.timeout(15000);

            let namePath = path.join(cyfs.get_temp_path(), "strfile");
            let datafile = path.join(namePath, "strfile64.txt")
            fs.removeSync(datafile)
            if (!fs.existsSync(datafile)) {
                RandomGenerator.createRandomFile(namePath, "strfile64.txt", 64 * 1024 * 1024);
            }
            let strRandom = fs.readFileSync(datafile).toString()
            let People = cyfs.People.create(
                owner,
                ood_list1,
                secret.public(),
                area,
                strRandom,
                icon,
            )
            People.set_icon(fileid1)
            let u8people = People.to_vec().unwrap()
            fs.writeFileSync(filepath8, u8people);
            assert(People.icon()?.equals(fileid1), 'icon 属性不相等');
            done()
        });
        it.skip("Ts编码：设置name大于128MB", async function (done) {
            this.timeout(20000);
            console.log("128kaihsi")
            let namePath = path.join(cyfs.get_temp_path(), "strfile");
            let datafile = path.join(namePath, "strfile128.txt")
            fs.removeSync(datafile)
            if (!fs.existsSync(datafile)) {
                RandomGenerator.createRandomFile(namePath, "strfile128.txt", 128 * 1024 * 1024);
            }
            let namedata = fs.readFileSync(datafile).toString()
            console.log("______________________2")
            let People = cyfs.People.create(
                owner,
                ood_list1,
                secret.public(),
                area,
                namedata,
                icon,
            )
            console.log("______________________3")
            People.set_icon(fileid1)
            console.log("______________________4")
            let u8people = People.to_vec().unwrap()
            console.log("______________________5")

            fs.writeFileSync(filepath9, u8people);
            console.log("______________________6")

            assert(People.icon()?.equals(fileid1), 'icon 属性不相等');
            done()
        });
        it("Ts编码：有效传入100个DeviceId组成的ood_list参数", async function () {
            let deviceid2 = cyfs.DeviceId.from_base_58(deviceidstr2).unwrap();
            let num: number = 100
            let ood_list: cyfs.DeviceId[] = new Array(num)
            for (let index: number = 0; index < num / 2; index++) { ood_list[index] = deviceid2; }
            for (let index: number = num / 2; index < num; index++) { ood_list[index] = deviceid; }
            let People = cyfs.People.create(
                owner,
                ood_list,
                secret.public(),
                area,
                name,
                icon,
            )
            let u8people = People.to_vec().unwrap()
            fs.writeFileSync(filepath10, People.to_vec().unwrap());
            let [target, buffer] = new cyfs.PeopleDecoder().raw_decode(u8people).unwrap();

            //获取属性
            let ood_list_deco = target.body_expect().content().ood_list

            //属性校验
            for (let i in ood_list_deco) {
                assert(ood_list_deco[i].equals(ood_list![i]), 'ood_list属性不相等')
            }
        });
        it("Ts编码：设置ood_work_mode为主备", async function () {
            let People = cyfs.People.create(
                owner,
                ood_list1,
                secret.public(),
                area,
                name,
                icon,
            )
            People.set_ood_work_mode(cyfs.OODWorkMode.ActiveStandby)
            let u8people = People.to_vec().unwrap()
            fs.writeFileSync(filepath11, u8people);
            PeopleId = People.desc().calculate_id();

            let [target, buffer] = new cyfs.PeopleDecoder().raw_decode(u8people).unwrap();

            //获取属性
            let owner_deco = target.desc().owner();
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
        it("Ts编码：传入的area为None", async function () {
            let People = cyfs.People.create(
                owner,
                ood_list1,
                secret.public(),
                undefined,
                name,
                icon,
            )
            let u8people = People.to_vec().unwrap()
            fs.writeFileSync(filepath12, u8people);
            PeopleId = People.desc().calculate_id();

            let [target, buffer] = new cyfs.PeopleDecoder().raw_decode(u8people).unwrap();

            //获取属性
            let owner_deco = target.desc().owner();
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
        it("Ts编码：传入的area值输入为0", async function () {
            let zeroarea = new cyfs.Area(0, 0, 0, 0);

            let People = cyfs.People.create(
                owner,
                ood_list1,
                secret.public(),
                zeroarea,
                name,
                icon,
            )
            let u8people = People.to_vec().unwrap()
            fs.writeFileSync(filepath13, u8people);
            PeopleId = People.desc().calculate_id();

            let [target, buffer] = new cyfs.PeopleDecoder().raw_decode(u8people).unwrap();

            //获取属性
            let owner_deco = target.desc().owner();
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
    });

    describe.skip("Rust编解码", function () {
        it("Rust工具解码(Ts编码对象)：有效对Ts编码对象进行Rust工具解码", async function () {
            let ffsClientPath = __dirname + '/test-tool/tool/desc-tool.exe';
            let args = ' show -a ' + filepath;
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
            let owner_deco: any = target.desc().owner()?.to_base_58();
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
        it("Ts从Rust解码：有效传入owner,ood_list,public,area,name,icon参数", async function () {
            let temp_path = cyfs.get_temp_path();
            let file_path = path.join(temp_path, "people.obj");
            if (fs.existsSync(file_path)) {
                let rust_buffer = decoder(file_path)

                let [target] = new cyfs.PeopleDecoder().raw_decode(rust_buffer).unwrap();

                //获取属性
                let owner_deco = target.desc().owner();
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
            } else { throw new Error("Rust侧未生成编码文件") };



        });
    });
})