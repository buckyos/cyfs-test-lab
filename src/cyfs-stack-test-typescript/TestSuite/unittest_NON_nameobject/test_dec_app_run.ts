import {cyfs} from '../../cyfs_node'
import * as path from 'path'
import * as fs from 'fs';
import { descpath, run, decoder, DeleteDescFile } from './index';
var assert = require("assert");


//DecApp对象测试
describe("测试DecApp对象编解码", function () {

    //定义创建对象传入参数
    let objectidstr = '5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW7oC';
    let id = 'dasdjaskdsdlljsdjlsdns';
    let version1 = '1.0.1.001'
    let version2 = '1.0.1.002'
    let descstr1 = 'test001版本 ！@#￥%……&*（'
    let descstr2 = 'test002版本 ）（*&……%￥'
    let objectidstr1 = '5r6LxrnSiNB2s2sAAxCBBCGxdrpNyipHJEN2gbnDLjnB'
    let objectidstr2 = '5r6LxrnKCDzdXQffyRTPbC94UPBUWjmXbZZqhPKFpVBz'

    let id_e = '';
    let version_e = '';
    let descstr_e = '';

    let objectid = cyfs.ObjectId.from_base_58(objectidstr).unwrap();
    let source1 = cyfs.ObjectId.from_base_58(objectidstr1).unwrap();
    let source2 = cyfs.ObjectId.from_base_58(objectidstr2).unwrap();

    //定义文件路径
    let filepath = descpath('DecApp')
    let filepath2 = descpath('DecApp2')
    let filepath3 = descpath('DecApp3')
    let filepath4 = descpath('DecApp4')
    let filepath5 = descpath('DecApp5')

    describe("编码", function () {
        it("Ts编码：有效传入owner,id参数", async function () {
            let DecApp = cyfs.DecApp.create(
                objectid,
                id
            )
            fs.writeFileSync(filepath, DecApp.to_vec().unwrap());
        });
        it("Ts编码：有效修改icon,desc属性", async function () {
            let DecApp = cyfs.DecApp.create(
                objectid,
                id
            )
            //icon，desc属性修改
            DecApp.body_expect().content().unwrap().icon = cyfs.Some(new cyfs.BuckyString(version1))
            DecApp.body_expect().content().unwrap().desc = cyfs.Some(new cyfs.BuckyString(descstr1))

            //属性校验
            assert.equal(version1, DecApp.icon())
            assert.equal(descstr1, DecApp.app_desc())

            fs.writeFileSync(filepath2, DecApp.to_vec().unwrap());
        });
        it("Ts编码：有效调用set_source()方法，修改source,source_desc属性", async function () {
            let DecApp = cyfs.DecApp.create(
                objectid,
                id
            );
            //调用set_source(),新增source,source_desc属性
            DecApp.set_source(version1, source1, cyfs.Some(descstr1).unwrap());
            DecApp.set_source(version2, source2, cyfs.Some(descstr2).unwrap());
            DecApp.set_source(version_e, source2, cyfs.Some(descstr_e).unwrap());

            //调用find_source_desc()
            let source_desc1 = DecApp.find_source_desc(version1).unwrap();
            let source_desc2 = DecApp.find_source_desc(version2).unwrap();
            let source_desc3 = DecApp.find_source_desc(version_e).unwrap();

            //调用find_source()
            let source_ts1 = DecApp.find_source(version1).unwrap();
            let source_ts3 = DecApp.find_source(version_e).unwrap();

            //调用source()
            let source_ts2 = DecApp.source().get(new cyfs.BuckyString(version2));

            //属性校验
            assert.equal(descstr1, source_desc1)
            assert.equal(descstr2, source_desc2)
            assert.equal(descstr_e, source_desc3)
            assert(source_ts1.equals(source1), 'source属性不相等')
            assert(source_ts2?.equals(source2), 'source属性不相等')
            assert(source_ts3?.equals(source2), 'source属性不相等')

            fs.writeFileSync(filepath3, DecApp.to_vec().unwrap());
        });
        it("Ts编码：remove_source()方法调用", async function () {
            let DecApp = cyfs.DecApp.create(
                objectid,
                id
            );
            //调用set_source(),新增source,source_desc属性
            DecApp.set_source(version1, source1, cyfs.Some(descstr1).unwrap());
            DecApp.set_source(version2, source2, cyfs.Some(descstr2).unwrap());

            //调用remove_source(),删除version1的值
            DecApp.remove_source(version1)

            //获取属性
            let source_desc1 = DecApp.body_expect().content().source_desc.get(new cyfs.BuckyString(version1));
            let source_desc2 = DecApp.body_expect().content().source_desc.get(new cyfs.BuckyString(version2));
            let source_ts1 = DecApp.source().get(new cyfs.BuckyString(version1));
            let source_ts2 = DecApp.source().get(new cyfs.BuckyString(version2));

            //属性校验
            assert.equal(undefined, source_desc1)
            assert.equal(descstr2, source_desc2)
            assert.equal(undefined, source_ts1?.to_base_58())
            assert(source_ts2?.equals(source2), 'source属性不相等')

            fs.writeFileSync(filepath4, DecApp.to_vec().unwrap());
        });
        it("Ts编码：有效传入id传入空值参数", async function () {
            let DecApp = cyfs.DecApp.create(
                objectid,
                id_e
            )
            fs.writeFileSync(filepath5, DecApp.to_vec().unwrap());
        });
    });

    describe("解码", function () {
        //Ts编码生成对象
        let DecApp = cyfs.DecApp.create(
            objectid,
            id
        )
        let DecAppId = DecApp.desc().calculate_id()
        fs.writeFileSync(filepath, DecApp.to_vec().unwrap());

        it("Ts解码(Ts编码对象)：有效对Ts编码对象进行Ts解码", async function () {
            //对象解码
            let desc_buffer = decoder(filepath)
            let [target, buffer] = new cyfs.DecAppDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let owner_deco = target.desc().owner()?.unwrap()
            let DecAppId_deco = target.desc().calculate_id()
            let id_deco = target.name()

            //属性校验
            assert(owner_deco?.equals(objectid), 'owner属性不相等');
            assert(DecAppId_deco.equals(DecAppId), 'DecAppId属性不相等');
            assert.equal(id, id_deco);
        });
        it("Ts解码(Ts编码对象)：有效对修改过icon,desc属性的对象进行Ts解码", async function () {
            //对象解码
            let desc_buffer = decoder(filepath2)
            let [target, buffer] = new cyfs.DecAppDecoder().raw_decode(desc_buffer).unwrap();

            //属性校验
            assert.equal(version1, target.icon())
            assert.equal(descstr1, target.app_desc())
        });
        it("Ts解码(Ts编码对象)：有效对修改过source,source_desc属性的对象进行Ts解码", async function () {
            //对象解码
            let desc_buffer = decoder(filepath3)
            let [target, buffer] = new cyfs.DecAppDecoder().raw_decode(desc_buffer).unwrap();

            //调用find_source_desc()
            let source_desc1 = target.find_source_desc(version1).unwrap();
            let source_desc2 = target.find_source_desc(version2).unwrap();
            let source_desc3 = target.find_source_desc(version_e).unwrap();

            //调用find_source()
            let source_ts1 = target.find_source(version1).unwrap();
            let source_ts2 = target.find_source(version2).unwrap();
            let source_ts3 = target.find_source(version_e).unwrap();

            //属性校验
            assert.equal(descstr1, source_desc1)
            assert.equal(descstr2, source_desc2)
            assert.equal(descstr_e, source_desc3)
            assert(source_ts1.equals(source1), 'source属性不相等')
            assert(source_ts2?.equals(source2), 'source属性不相等')
            assert(source_ts3?.equals(source2), 'source属性不相等')
        });
        it("Ts解码(Ts编码对象)：有效对调用remove_source()的对象进行Ts解码", async function () {
            //对象解码
            let desc_buffer = decoder(filepath4)
            let [target, buffer] = new cyfs.DecAppDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let source_desc_deco = target.body_expect().content().source_desc
            let source_deco = target.source()

            //属性校验
            source_desc_deco.forEach((value, key) => {
                //校验已删除的 version1的值是否为undefined
                if (key.toString() == version1) {
                    assert.equal(undefined, key)
                    assert.equal(undefined, value)
                }
            })
            source_deco.forEach((value, key) => {
                //校验已删除的 version1的值是否为undefined
                if (key.toString() == version1) {
                    assert.equal(undefined, key)
                    assert.equal(undefined, value)
                }
            })
        });
        it("Ts解码(Ts编码对象)：有效id传入空值进行Ts解码", async function () {
            //对象解码
            let desc_buffer = decoder(filepath5)
            let [target, buffer] = new cyfs.DecAppDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let id_deco = target.name()

            //属性校验
            assert.equal(id_e, id_deco);
        });

        it("Rust工具解码(Ts编码对象)：有效对Ts编码对象进行Rust工具解码", async function () {
            let ffsClientPath = __dirname + '/test-tool/tool/desc-tool.exe';
            let args = ' show -a ' + filepath;
            let runInfo = await run(ffsClientPath, args, false, (data: string) => {
                let arr1 = data.split(/: |\n/);
                for (let i in arr1) {
                    let value = arr1[i];
                    let index: any = Number(i) + 1;
                    //校验DecAppId属性
                    if (value == 'objectid') {
                        let objectid_rust = arr1[index]
                        assert.equal(DecAppId.to_base_58(), objectid_rust)
                    };
                    //校验owner属性
                    if (value == 'owner') {
                        let owner_rust = arr1[index]
                        assert.equal(objectidstr, owner_rust)
                    }
                    //校验name属性
                    if (value == 'name') {
                        let name_rust = arr1[index]
                        assert.equal(id, name_rust)
                    }
                }
            });
        });

        it.skip("Rust工具编码->Ts解码：有效进行Rust工具编码对象，再进行Ts解码流程", async function () {
            //rust创建对象
            //创建cmd命令：app-tool.exe app create "13213286383" --owner ./test_config/test_owner
            let ffsClientPath = __dirname + '/test-tool/tool/app-tool.exe';
            let args1 = ' app create "13213286383" --owner ./test_config/test_owner';
            var rust_desc = ''
            let runInfo1 = await run(ffsClientPath, args1, false, (data: string) => {
                rust_desc = data.slice(data.length - 57, data.length - 13)
            })

            //Ts解码(Ts编码对象)对象,获取属性
            let rustfilepath = __dirname + '/test-tool/tool/' + rust_desc + '.obj'
            let desc_buffer = decoder(rustfilepath)
            let [target, buffer] = new cyfs.DecAppDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let owner_ts: any = target.desc().owner()?.unwrap().to_base_58();
            let DecAppId_ts: string = target.desc().calculate_id().to_base_58()
            let id_ts = target.name()

            //rust解码对象，校验属性值
            let ffsClientPath2 = __dirname + '/test-tool/tool/desc-tool.exe';
            let args2 = ' show -a ' + rustfilepath;
            let runInfo2 = await run(ffsClientPath2, args2, false, (data: string) => {
                let arr1 = data.split(/: |\n/);

                for (let i in arr1) {
                    let value = arr1[i];
                    let index: any = Number(i) + 1;
                    //校验DecAppId属性
                    if (value == 'objectid') {
                        let objectid_rust = arr1[index]
                        assert.equal(DecAppId_ts, objectid_rust)
                    }
                    //校验owner属性
                    if (value == 'owner') {
                        let owner_rust = arr1[index]
                        assert.equal(owner_ts, owner_rust)
                    }
                    //校验name属性
                    if (value.indexOf('name') == 0) {
                        let name_rust = value.slice(5, value.length)
                        assert.equal(id_ts, name_rust)

                        //验证所有属性测试通过，执行删除测试desc文件命令
                        DeleteDescFile(rustfilepath)
                    }
                }
            })
        });
    });
})