import {cyfs} from '../../cyfs_node'
import * as path from 'path'
import * as fs from 'fs';
import { descpath, run, decoder, DeleteDescFile } from './index';
var assert = require("assert");


//AppList对象测试
describe("测试AppList对象编解码", function () {

    //定义创建对象传入参数
    let objectidstr = '5r4MYfFdhhaG9ENa8ED1AYRttuGNYDBiaZdpBHGsW7oC';
    let decappidstr1 = '9tGpLNnX15t9qjxyAsABtdfEFUMLLHtA9iWtfVJN2BqR';
    let decappidstr2 = '9tGpLNnBFQCLADCM6BHWa953N84yZyjvNvvMb3pURVCk';
    let id = '你好123!@#QWE';
    let category = '123456789';
    let version1 = '1.0.111';
    let version2 = '1.0.222';
    let id_e = '';
    let category_e = '';

    let owner = cyfs.ObjectId.from_str(objectidstr).unwrap()
    let decid1 = cyfs.DecAppId.from_base_58(decappidstr1).unwrap()
    let decid2 = cyfs.DecAppId.from_base_58(decappidstr2).unwrap()
    //定义AppStatus对象
    let AppStatus1 = cyfs.AppStatus.create(
        owner,
        decid1,
        version1,
        false
    )
    let AppStatus2 = cyfs.AppStatus.create(
        owner,
        decid2,
        version2,
        true
    )

    //定义文件路径
    let filepath = descpath('AppList')
    let filepath2 = descpath('AppList2')
    let filepath3 = descpath('AppList3')
    let filepath4 = descpath('AppList4')
    let filepath5 = descpath('AppList5')

    describe("编码", function () {
        it("Ts编码：有效传入owner,id,category参数", async function () {
            let AppList = cyfs.AppList.create(
                owner,
                id,
                category
            )
            fs.writeFileSync(filepath, AppList.to_vec().unwrap());
        });
        it("Ts编码：有效传入id,category传入空值", async function () {
            let AppList = cyfs.AppList.create(
                owner,
                id_e,
                category_e
            )
            fs.writeFileSync(filepath5, AppList.to_vec().unwrap());
        });
    });
    describe("编码-操作方法调用", function () {
        it("Ts编码：有效app_list()调用,查看app_list的值", async function () {
            let AppList = cyfs.AppList.create(
                owner,
                id,
                category
            )
            let app_status_map = AppList.app_list()
            assert.equal(0, app_status_map.size);
            fs.writeFileSync(filepath, AppList.to_vec().unwrap());
        });
        it("Ts编码：有效put()调用，修改app_list的值", async function () {
            let AppList = cyfs.AppList.create(
                owner,
                id,
                category
            )
            //put()调用
            AppList.put(AppStatus1);
            fs.writeFileSync(filepath2, AppList.to_vec().unwrap());

            //获取属性
            let app_status_map = AppList.app_list()
            let has_appid = app_status_map.has(decid1)
            let app_status_target = app_status_map.get(decid1)
            let owner_deco = app_status_target?.desc().owner()?.unwrap();
            let id_deco = app_status_target?.app_id();
            let version_deco = app_status_target?.version();
            let status1 = app_status_target?.status()

            //属性校验
            assert(owner_deco?.equals(owner), 'owner属性不相等');
            assert(id_deco?.equals(decid1), 'decappid属性不相等');
            assert.equal(true, has_appid);
            assert.equal(version1, version_deco);
            assert.equal(false, status1);
            assert.equal(1, AppList.app_list().size);
        });
        it("Ts编码：有效remove()调用，删除app_list的值", async function () {
            let AppList = cyfs.AppList.create(
                owner,
                id,
                category
            )
            //remove()调用
            AppList.put(AppStatus1);
            AppList.remove(decid1);
            fs.writeFileSync(filepath3, AppList.to_vec().unwrap());
            assert.equal(0, AppList.app_list().size);

        });
        it("Ts编码：有效clear()调用，清空app_list的值", async function () {
            let AppList = cyfs.AppList.create(
                owner,
                id,
                category
            )
            //put()调用
            AppList.put(AppStatus1);
            AppList.put(AppStatus2);
            AppList.put(AppStatus1);
            assert.equal(2, AppList.app_list().size);

            //clear()调用
            AppList.clear();
            assert.equal(0, AppList.app_list().size);
            fs.writeFileSync(filepath4, AppList.to_vec().unwrap());
        });
    });

    describe("解码", function () {
        //Ts编码生成对象
        let AppList = cyfs.AppList.create(
            owner,
            id,
            category
        )
        let AppListId = AppList.desc().calculate_id();
        fs.writeFileSync(filepath, AppList.to_vec().unwrap());

        it("Ts解码(Ts编码对象)：有效对Ts编码对象进行Ts解码", async function () {
            //对象解码
            let desc_buffer = decoder(filepath)
            let [target, buffer] = new cyfs.AppListDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let owner_deco = target.desc().owner()?.unwrap();
            let AppListId_deco = target.desc().calculate_id();
            let id_deco = target.desc().content().id
            let category_deco = target.desc().content().category

            //属性校验
            assert(owner_deco?.equals(owner), 'owner属性不相等');
            assert(AppListId_deco?.equals(AppListId), 'AppListId属性不相等');
            assert.equal(id, id_deco);
            assert.equal(category, category_deco);
        });
        it("Ts解码(Ts编码对象)：有效对id,category传入空值进行Ts解码", async function () {
            //对象解码
            let desc_buffer = decoder(filepath5)
            let [target, buffer] = new cyfs.AppListDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let id_deco = target.desc().content().id
            let category_deco = target.desc().content().category

            //属性校验
            assert.equal(id_e, id_deco);
            assert.equal(category_e, category_deco);
        });
        it("Ts解码(Ts编码对象)：有效对修改过app_list属性的对象进行Ts解码", async function () {
            //对象解码
            let desc_buffer = decoder(filepath2)
            let [target, buffer] = new cyfs.AppListDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let app_status_map = target.app_list()
            app_status_map.forEach((value, key) => {

                //获取AppStatus属性
                let owner_deco = value?.desc().owner()?.unwrap();
                let id_deco = value?.app_id();
                let version_deco = value?.version();
                let status1 = value?.status()

                //属性校验
                assert(key.equals(decid1), 'decid属性不相等');
                assert(owner_deco?.equals(owner), 'owner属性不相等');
                assert(id_deco?.equals(decid1), 'decid属性不相等');
                assert.equal(version1, version_deco);
                assert.equal(false, status1);
            })
        });
        it("Ts解码(Ts编码对象)：有效对调用remove()的对象进行Ts解码", async function () {
            //对象解码
            let desc_buffer = decoder(filepath3)
            let [target, buffer] = new cyfs.AppListDecoder().raw_decode(desc_buffer).unwrap();

            //属性校验
            assert.equal(0, target.app_list().size);
        });
        it("Ts解码(Ts编码对象)：有效对调用clear()的对象进行Ts解码", async function () {
            //对象解码
            let desc_buffer = decoder(filepath4)
            let [target, buffer] = new cyfs.AppListDecoder().raw_decode(desc_buffer).unwrap();

            //属性校验
            assert.equal(0, target.app_list().size);
        });

        it("Rust工具解码(Ts编码对象)：有效对Ts编码对象进行Rust工具解码", async function () {
            let ffsClientPath = __dirname + '/test-tool/tool/desc-tool.exe';
            let args = ' show -a ' + filepath;
            let runInfo = await run(ffsClientPath, args, false, (data: string) => {
                let arr1 = data.split(/: |\n/);
                for (let i in arr1) {
                    let value = arr1[i];
                    let index: any = Number(i) + 1;
                    //校验AppList属性
                    if (value == 'objectid') {
                        let objectid_rust = arr1[index]
                        assert.equal(AppListId.to_base_58(), objectid_rust)
                    };
                    //校验owner属性
                    if (value == 'owner') {
                        let owner_rust = arr1[index]
                        assert.equal(objectidstr, owner_rust)
                    }
                }
            })
        });

        it.skip("Rust工具编码->Ts解码：有效进行Rust工具编码对象，再进行Ts解码流程", async function () {
            //rust创建对象
            //创建cmd命令：app-tool.exe list create --name "12321321321321" --owner  ./test_config/test_owner --type app
            let ffsClientPath = __dirname + '/test-tool/tool/app-tool.exe';
            let args1 = ' list create --name "12321321321321" --owner  ./test_config/test_owner --type app';
            var rust_desc = ''
            let runInfo1 = await run(ffsClientPath, args1, false, (data: string) => {
                rust_desc = data.slice(data.length - 57, data.length - 13)
            })

            //Ts解码(Ts编码对象)对象,获取属性
            let rustfilepath = __dirname + '/test-tool/tool/' + rust_desc + '.obj'
            let desc_buffer = decoder(rustfilepath)
            let [target, buffer] = new cyfs.AppListDecoder().raw_decode(desc_buffer).unwrap();

            //获取属性
            let owner_ts: any = target.desc().owner()?.unwrap().to_base_58();
            let AppListId_ts: string = target.desc().calculate_id().to_base_58()

            //rust解码对象，校验属性值
            let ffsClientPath2 = __dirname + '/test-tool/tool/desc-tool.exe';
            let args2 = ' show -a ' + rustfilepath;
            let runInfo2 = await run(ffsClientPath2, args2, false, (data: string) => {
                let arr1 = data.split(/: |\n/);
                for (let i in arr1) {
                    let value = arr1[i];
                    let index: any = Number(i) + 1;
                    //校验AppList属性
                    if (value == 'objectid') {
                        let objectid_rust = arr1[index]
                        assert.equal(AppListId_ts, objectid_rust)
                    };
                    //校验owner属性
                    if (value == 'owner') {
                        let owner_rust = arr1[index]
                        assert.equal(owner_ts, owner_rust)

                        //验证所有属性测试通过，执行删除测试desc文件命令
                        DeleteDescFile(rustfilepath)
                    }
                }
            })
        });

    });

})
